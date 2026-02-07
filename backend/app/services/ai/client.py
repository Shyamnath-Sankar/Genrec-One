"""
OpenAI-compatible AI client.
Supports any OpenAI-compatible API (OpenAI, Azure, Ollama, vLLM, etc.)
"""
import json
import asyncio
from typing import AsyncGenerator, Optional, List, Dict, Any
from dataclasses import dataclass
import httpx

from app.core.config import settings


@dataclass
class ChatMessage:
    """Represents a chat message for the AI API"""
    role: str
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        msg = {"role": self.role}
        if self.content is not None:
            msg["content"] = self.content
        if self.tool_calls:
            msg["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            msg["tool_call_id"] = self.tool_call_id
        if self.name:
            msg["name"] = self.name
        return msg


@dataclass
class ToolCall:
    """Represents a tool call from the AI"""
    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class AIResponse:
    """Response from AI completion"""
    content: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    finish_reason: str = "stop"
    model: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class AIClient:
    """
    OpenAI-compatible AI client.
    Supports streaming and non-streaming completions with tool calling.
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.api_key = api_key or getattr(settings, "OPENAI_API_KEY", None)
        self.base_url = base_url or getattr(settings, "OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.model = model or getattr(settings, "AI_MODEL", "gpt-4o-mini")
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=120.0,
        )
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()
    
    def _build_request(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        stream: bool = False,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> Dict[str, Any]:
        """Build the request payload"""
        request = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }
        
        if tools:
            request["tools"] = tools
            request["tool_choice"] = "auto"
        
        return request
    
    async def complete(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AIResponse:
        """
        Non-streaming completion.
        Returns the full response after processing.
        """
        request = self._build_request(
            messages=messages,
            tools=tools,
            stream=False,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        response = await self.client.post("/chat/completions", json=request)
        response.raise_for_status()
        data = response.json()
        
        choice = data["choices"][0]
        message = choice["message"]
        
        # Parse tool calls if present
        tool_calls = None
        if message.get("tool_calls"):
            tool_calls = [
                ToolCall(
                    id=tc["id"],
                    name=tc["function"]["name"],
                    arguments=json.loads(tc["function"]["arguments"]),
                )
                for tc in message["tool_calls"]
            ]
        
        usage = data.get("usage", {})
        
        return AIResponse(
            content=message.get("content"),
            tool_calls=tool_calls,
            finish_reason=choice.get("finish_reason", "stop"),
            model=data.get("model"),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
        )
    
    async def stream(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """
        Streaming completion.
        Yields content chunks as they arrive.
        Note: Tool calls are accumulated and returned at the end.
        """
        request = self._build_request(
            messages=messages,
            tools=tools,
            stream=True,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        async with self.client.stream("POST", "/chat/completions", json=request) as response:
            response.raise_for_status()
            
            accumulated_tool_calls = {}
            
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                
                data = line[6:]  # Remove "data: " prefix
                
                if data == "[DONE]":
                    # Return accumulated tool calls as JSON at the end
                    if accumulated_tool_calls:
                        yield f"\n__TOOL_CALLS__{json.dumps(list(accumulated_tool_calls.values()))}"
                    break
                
                try:
                    chunk = json.loads(data)
                    choice = chunk["choices"][0]
                    delta = choice.get("delta", {})
                    
                    # Handle content chunks
                    if content := delta.get("content"):
                        yield content
                    
                    # Accumulate tool calls
                    if tool_calls := delta.get("tool_calls"):
                        for tc in tool_calls:
                            idx = tc["index"]
                            if idx not in accumulated_tool_calls:
                                accumulated_tool_calls[idx] = {
                                    "id": tc.get("id", ""),
                                    "name": "",
                                    "arguments": "",
                                }
                            if tc.get("id"):
                                accumulated_tool_calls[idx]["id"] = tc["id"]
                            if func := tc.get("function"):
                                if func.get("name"):
                                    accumulated_tool_calls[idx]["name"] = func["name"]
                                if func.get("arguments"):
                                    accumulated_tool_calls[idx]["arguments"] += func["arguments"]
                
                except json.JSONDecodeError:
                    continue
    
    async def stream_with_tools(
        self,
        messages: List[ChatMessage],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Streaming completion that properly handles tool calls.
        Yields structured events:
        - {"type": "content", "content": "..."}
        - {"type": "tool_calls", "tool_calls": [...]}
        - {"type": "done", "finish_reason": "..."}
        """
        request = self._build_request(
            messages=messages,
            tools=tools,
            stream=True,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        async with self.client.stream("POST", "/chat/completions", json=request) as response:
            response.raise_for_status()
            
            accumulated_tool_calls = {}
            finish_reason = "stop"
            
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                
                data = line[6:]
                
                if data == "[DONE]":
                    # Emit accumulated tool calls if any
                    if accumulated_tool_calls:
                        parsed_tools = []
                        for tc in accumulated_tool_calls.values():
                            try:
                                args = json.loads(tc["arguments"]) if tc["arguments"] else {}
                            except json.JSONDecodeError:
                                args = {}
                            parsed_tools.append(ToolCall(
                                id=tc["id"],
                                name=tc["name"],
                                arguments=args,
                            ))
                        yield {"type": "tool_calls", "tool_calls": parsed_tools}
                    
                    yield {"type": "done", "finish_reason": finish_reason}
                    break
                
                try:
                    chunk = json.loads(data)
                    choice = chunk["choices"][0]
                    delta = choice.get("delta", {})
                    
                    if fr := choice.get("finish_reason"):
                        finish_reason = fr
                    
                    # Yield content chunks
                    if content := delta.get("content"):
                        yield {"type": "content", "content": content}
                    
                    # Accumulate tool calls
                    if tool_calls := delta.get("tool_calls"):
                        for tc in tool_calls:
                            idx = tc["index"]
                            if idx not in accumulated_tool_calls:
                                accumulated_tool_calls[idx] = {
                                    "id": tc.get("id", ""),
                                    "name": "",
                                    "arguments": "",
                                }
                            if tc.get("id"):
                                accumulated_tool_calls[idx]["id"] = tc["id"]
                            if func := tc.get("function"):
                                if func.get("name"):
                                    accumulated_tool_calls[idx]["name"] = func["name"]
                                if func.get("arguments"):
                                    accumulated_tool_calls[idx]["arguments"] += func["arguments"]
                
                except json.JSONDecodeError:
                    continue
