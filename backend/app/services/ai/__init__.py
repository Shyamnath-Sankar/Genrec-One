"""
AI Service Package for HRMS Chatbot.
Provides OpenAI-compatible client, tool definitions, and execution services.
"""
from app.services.ai.client import AIClient
from app.services.ai.tools import HRMS_TOOLS, get_tool_by_name
from app.services.ai.executor import ToolExecutor
from app.services.ai.prompts import get_system_prompt

__all__ = [
    "AIClient",
    "HRMS_TOOLS",
    "get_tool_by_name",
    "ToolExecutor",
    "get_system_prompt",
]
