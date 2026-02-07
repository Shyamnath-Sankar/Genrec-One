"""
Chat API Router for AI Chatbot.
Provides endpoints for chat sessions and message streaming.
"""
import json
import uuid
from datetime import datetime
from typing import Optional, List, AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.chat import ChatSession, ChatMessage, MessageRole, MessageStatus
from app.schemas.auth import DataResponse, PaginatedResponse
from app.services.ai import AIClient, ToolExecutor, get_system_prompt
from app.services.ai.client import ChatMessage as AIChatMessage
from app.services.ai.tools import get_tools_for_openai, get_tool_by_name


router = APIRouter(prefix="/chat", tags=["AI Chat"])


# ============================================
# Pydantic Schemas
# ============================================

class SendMessageRequest(BaseModel):
    """Request to send a message"""
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[str] = None


class CreateSessionRequest(BaseModel):
    """Request to create a new session"""
    title: Optional[str] = None


class SessionResponse(BaseModel):
    """Session data"""
    id: str
    title: Optional[str]
    message_count: int
    created_at: datetime
    last_message_at: Optional[datetime]


class MessageResponse(BaseModel):
    """Message data"""
    id: str
    role: str
    content: Optional[str]
    tool_calls: Optional[List[dict]]
    status: str
    created_at: datetime


class ConfirmToolRequest(BaseModel):
    """Request to confirm a tool execution"""
    tool_execution_id: str
    confirmed: bool
    reason: Optional[str] = None


# ============================================
# Session Management Endpoints
# ============================================

@router.get("/sessions", response_model=PaginatedResponse)
async def get_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all chat sessions for the current employee"""
    # Count total
    count_query = (
        select(func.count())
        .select_from(ChatSession)
        .where(ChatSession.employee_id == current_employee.id)
    )
    result = await db.execute(count_query)
    total = result.scalar() or 0
    
    # Get sessions
    query = (
        select(ChatSession)
        .where(ChatSession.employee_id == current_employee.id)
        .order_by(ChatSession.updated_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return PaginatedResponse(
        data=[
            {
                "id": s.id,
                "title": s.title or "New Chat",
                "message_count": s.message_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "last_message_at": s.last_message_at.isoformat() if s.last_message_at else None,
            }
            for s in sessions
        ],
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
    )


@router.post("/sessions", response_model=DataResponse)
async def create_session(
    data: CreateSessionRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session"""
    session = ChatSession(
        id=str(uuid.uuid4()),
        employee_id=current_employee.id,
        title=data.title,
        is_active=True,
        context={
            "employee_id": current_employee.employee_id,
            "department": current_employee.department.name if current_employee.department else None,
            "designation": current_employee.designation.name if current_employee.designation else None,
        },
    )
    db.add(session)
    await db.commit()
    
    return DataResponse(
        message="Session created",
        data={
            "id": session.id,
            "title": session.title or "New Chat",
        },
    )


@router.get("/sessions/{session_id}", response_model=DataResponse)
async def get_session(
    session_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get a chat session with messages"""
    query = (
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id)
        .where(ChatSession.employee_id == current_employee.id)
    )
    
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return DataResponse(
        data={
            "id": session.id,
            "title": session.title or "New Chat",
            "message_count": session.message_count,
            "messages": [
                {
                    "id": m.id,
                    "role": m.role.value,
                    "content": m.content,
                    "tool_calls": m.tool_calls,
                    "status": m.status.value,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in session.messages
            ],
        },
    )


@router.delete("/sessions/{session_id}", response_model=DataResponse)
async def delete_session(
    session_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session"""
    query = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .where(ChatSession.employee_id == current_employee.id)
    )
    
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.delete(session)
    await db.commit()
    
    return DataResponse(message="Session deleted")


# ============================================
# Chat Endpoints
# ============================================

@router.post("/send", response_model=DataResponse)
async def send_message(
    data: SendMessageRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and get AI response (non-streaming).
    Creates a new session if session_id is not provided.
    """
    # Get or create session
    if data.session_id:
        query = (
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.id == data.session_id)
            .where(ChatSession.employee_id == current_employee.id)
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ChatSession(
            id=str(uuid.uuid4()),
            employee_id=current_employee.id,
            is_active=True,
            context={
                "employee_id": current_employee.employee_id,
            },
        )
        db.add(session)
        await db.flush()
    
    # Create user message
    user_message = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session.id,
        role=MessageRole.USER,
        content=data.message,
        status=MessageStatus.COMPLETED,
    )
    db.add(user_message)
    
    # Update session title from first message
    if not session.title and data.message:
        session.title = data.message[:50] + ("..." if len(data.message) > 50 else "")
    
    # Build message history
    messages = [
        AIChatMessage(
            role="system",
            content=get_system_prompt(
                employee_name=f"{current_employee.first_name} {current_employee.last_name}",
                employee_id=current_employee.employee_id,
                department=current_employee.department.name if current_employee.department else None,
                designation=current_employee.designation.name if current_employee.designation else None,
                is_manager=len(current_employee.subordinates) > 0 if hasattr(current_employee, 'subordinates') else False,
                company_name=current_employee.company.name if current_employee.company else "Company",
            ),
        ),
    ]
    
    # Add conversation history
    for msg in session.messages[-20:]:  # Last 20 messages for context
        messages.append(AIChatMessage(
            role=msg.role.value,
            content=msg.content,
            tool_calls=msg.tool_calls,
            tool_call_id=msg.tool_call_id,
        ))
    
    # Add current message
    messages.append(AIChatMessage(role="user", content=data.message))
    
    # Get AI response
    ai_client = AIClient()
    tools = get_tools_for_openai()
    
    try:
        response = await ai_client.complete(messages=messages, tools=tools)
        
        # Handle tool calls
        if response.tool_calls:
            # Execute tools
            executor = ToolExecutor(db, current_employee)
            tool_results = []
            
            for tool_call in response.tool_calls:
                tool_def = get_tool_by_name(tool_call.name)
                
                # Check if confirmation is required
                if tool_def and tool_def.requires_confirmation:
                    # For now, auto-execute (confirmation UI will be added later)
                    pass
                
                success, result, execution = await executor.execute(
                    tool_name=tool_call.name,
                    arguments=tool_call.arguments,
                    tool_call_id=tool_call.id,
                    session_id=session.id,
                    message_id=user_message.id,
                )
                
                tool_results.append({
                    "tool_call_id": tool_call.id,
                    "name": tool_call.name,
                    "success": success,
                    "result": result,
                })
            
            # Add assistant message with tool calls
            assistant_message = ChatMessage(
                id=str(uuid.uuid4()),
                session_id=session.id,
                role=MessageRole.ASSISTANT,
                content=response.content,
                tool_calls=[
                    {
                        "id": tc.id,
                        "name": tc.name,
                        "arguments": tc.arguments,
                    }
                    for tc in response.tool_calls
                ],
                status=MessageStatus.COMPLETED,
                model=response.model,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                total_tokens=response.total_tokens,
            )
            db.add(assistant_message)
            
            # Add tool result messages
            for tr in tool_results:
                tool_message = ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session.id,
                    role=MessageRole.TOOL,
                    content=json.dumps(tr["result"]),
                    tool_call_id=tr["tool_call_id"],
                    status=MessageStatus.COMPLETED,
                )
                db.add(tool_message)
            
            # Get final response incorporating tool results
            messages.append(AIChatMessage(
                role="assistant",
                content=response.content,
                tool_calls=[
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.name,
                            "arguments": json.dumps(tc.arguments),
                        }
                    }
                    for tc in response.tool_calls
                ],
            ))
            
            for tr in tool_results:
                messages.append(AIChatMessage(
                    role="tool",
                    content=json.dumps(tr["result"]),
                    tool_call_id=tr["tool_call_id"],
                ))
            
            final_response = await ai_client.complete(messages=messages, tools=tools)
            
            final_message = ChatMessage(
                id=str(uuid.uuid4()),
                session_id=session.id,
                role=MessageRole.ASSISTANT,
                content=final_response.content,
                status=MessageStatus.COMPLETED,
                model=final_response.model,
            )
            db.add(final_message)
            
            response_content = final_response.content
        else:
            # No tool calls, just text response
            assistant_message = ChatMessage(
                id=str(uuid.uuid4()),
                session_id=session.id,
                role=MessageRole.ASSISTANT,
                content=response.content,
                status=MessageStatus.COMPLETED,
                model=response.model,
                prompt_tokens=response.prompt_tokens,
                completion_tokens=response.completion_tokens,
                total_tokens=response.total_tokens,
            )
            db.add(assistant_message)
            response_content = response.content
        
        # Update session stats
        session.message_count += 2  # User + assistant
        session.last_message_at = datetime.utcnow()
        
        await db.commit()
        
        return DataResponse(
            data={
                "session_id": session.id,
                "response": response_content,
            },
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await ai_client.close()


@router.post("/stream")
async def stream_message(
    data: SendMessageRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message and stream AI response.
    Returns Server-Sent Events (SSE) stream.
    """
    # Pre-extract all data we need BEFORE entering the generator
    # This avoids lazy loading issues inside the async generator
    employee_id = current_employee.id
    employee_code = current_employee.employee_id
    employee_name = f"{current_employee.first_name} {current_employee.last_name}"
    department_name = current_employee.department.name if current_employee.department else None
    designation_name = current_employee.designation.name if current_employee.designation else None
    company_name = current_employee.company.name if current_employee.company else "Company"
    
    message_content = data.message
    session_id_input = data.session_id
    
    # Pre-load session and messages if session_id provided
    existing_session_id = None
    existing_session_title = None
    existing_session_message_count = 0
    history_messages: List[dict] = []
    
    if session_id_input:
        query = (
            select(ChatSession)
            .options(selectinload(ChatSession.messages))
            .where(ChatSession.id == session_id_input)
            .where(ChatSession.employee_id == employee_id)
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        
        if not session:
            return StreamingResponse(
                iter([f"data: {json.dumps({'type': 'error', 'error': 'Session not found'})}\n\n"]),
                media_type="text/event-stream",
            )
        
        existing_session_id = session.id
        existing_session_title = session.title
        existing_session_message_count = session.message_count
        
        # Pre-load message history as plain dicts
        for msg in session.messages[-20:]:
            history_messages.append({
                "role": msg.role.value,
                "content": msg.content,
            })
    
    async def generate() -> AsyncGenerator[str, None]:
        nonlocal existing_session_id, existing_session_title, existing_session_message_count
        
        # Create a NEW database session for the generator
        async with AsyncSessionLocal() as gen_db:
            try:
                # Create or get session
                if existing_session_id:
                    session_id = existing_session_id
                    session_title = existing_session_title
                    session_message_count = existing_session_message_count
                    
                    # Re-fetch the session object for updates
                    query = select(ChatSession).where(ChatSession.id == session_id)
                    result = await gen_db.execute(query)
                    session = result.scalar_one()
                else:
                    # Create new session
                    session = ChatSession(
                        id=str(uuid.uuid4()),
                        employee_id=employee_id,
                        is_active=True,
                    )
                    gen_db.add(session)
                    await gen_db.flush()
                    session_id = session.id
                    session_title = None
                    session_message_count = 0
                
                # Create user message
                user_message_id = str(uuid.uuid4())
                user_message = ChatMessage(
                    id=user_message_id,
                    session_id=session_id,
                    role=MessageRole.USER,
                    content=message_content,
                    status=MessageStatus.COMPLETED,
                )
                gen_db.add(user_message)
                
                # Update session title if needed
                if not session_title and message_content:
                    session.title = message_content[:50] + ("..." if len(message_content) > 50 else "")
                
                await gen_db.flush()
                
                # Send session info
                yield f"data: {json.dumps({'type': 'session', 'session_id': session_id})}\n\n"
                
                # Build AI messages
                ai_messages = [
                    AIChatMessage(
                        role="system",
                        content=get_system_prompt(
                            employee_name=employee_name,
                            employee_id=employee_code,
                            department=department_name,
                            designation=designation_name,
                            is_manager=False,
                            company_name=company_name,
                        ),
                    ),
                ]
                
                # Add history from pre-loaded data
                for msg in history_messages:
                    ai_messages.append(AIChatMessage(
                        role=msg["role"],
                        content=msg["content"],
                    ))
                
                # Add current message
                ai_messages.append(AIChatMessage(role="user", content=message_content))
                
                # Stream AI response
                ai_client = AIClient()
                tools = get_tools_for_openai()
                full_content = ""
                tool_calls_data = None
                
                try:
                    async for event in ai_client.stream_with_tools(messages=ai_messages, tools=tools):
                        if event["type"] == "content":
                            content = event["content"]
                            full_content += content
                            yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                        
                        elif event["type"] == "tool_calls":
                            tool_calls_data = event["tool_calls"]
                            yield f"data: {json.dumps({'type': 'tool_calls', 'tool_calls': [{'name': tc.name, 'arguments': tc.arguments} for tc in tool_calls_data]})}\n\n"
                        
                        elif event["type"] == "done":
                            break
                    
                    # Handle tool calls if any
                    if tool_calls_data:
                        # Re-fetch employee for tool execution with all relationships
                        emp_query = (
                            select(Employee)
                            .options(
                                selectinload(Employee.department),
                                selectinload(Employee.designation),
                                selectinload(Employee.company),
                                selectinload(Employee.role),
                            )
                            .where(Employee.id == employee_id)
                        )
                        emp_result = await gen_db.execute(emp_query)
                        emp = emp_result.scalar_one()
                        
                        executor = ToolExecutor(gen_db, emp)
                        tool_result = None
                        
                        for tool_call in tool_calls_data:
                            tool_def = get_tool_by_name(tool_call.name)
                            
                            # Check if this tool requires confirmation
                            if tool_def and tool_def.requires_confirmation:
                                yield f"data: {json.dumps({'type': 'confirmation_required', 'tool': tool_call.name, 'tool_call_id': tool_call.id, 'arguments': tool_call.arguments, 'description': tool_def.description})}\n\n"
                                # For now, auto-execute after sending confirmation notice
                                # In future, we'll wait for user confirmation via websocket or separate endpoint
                            
                            yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_call.name})}\n\n"
                            
                            success, result, execution = await executor.execute(
                                tool_name=tool_call.name,
                                arguments=tool_call.arguments,
                                tool_call_id=tool_call.id,
                                session_id=session_id,
                                message_id=user_message_id,
                            )
                            tool_result = result
                            
                            yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool_call.name, 'success': success, 'result': result})}\n\n"
                        
                        # Get final response with tool results
                        ai_messages.append(AIChatMessage(
                            role="assistant",
                            content=full_content if full_content else None,
                            tool_calls=[
                                {
                                    "id": tc.id,
                                    "type": "function",
                                    "function": {
                                        "name": tc.name,
                                        "arguments": json.dumps(tc.arguments),
                                    }
                                }
                                for tc in tool_calls_data
                            ],
                        ))
                        
                        for tool_call in tool_calls_data:
                            ai_messages.append(AIChatMessage(
                                role="tool",
                                content=json.dumps(tool_result),
                                tool_call_id=tool_call.id,
                            ))
                        
                        # Reset content for final response
                        full_content = ""
                        
                        async for event in ai_client.stream_with_tools(messages=ai_messages, tools=tools):
                            if event["type"] == "content":
                                full_content += event["content"]
                                yield f"data: {json.dumps({'type': 'content', 'content': event['content']})}\n\n"
                            elif event["type"] == "done":
                                break
                    
                    # Save assistant message
                    assistant_message = ChatMessage(
                        id=str(uuid.uuid4()),
                        session_id=session_id,
                        role=MessageRole.ASSISTANT,
                        content=full_content,
                        status=MessageStatus.COMPLETED,
                    )
                    gen_db.add(assistant_message)
                    
                    # Update session stats
                    session.message_count = session_message_count + 2
                    session.last_message_at = datetime.utcnow()
                    
                    await gen_db.commit()
                    
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    
                except Exception as e:
                    await gen_db.rollback()
                    yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
                finally:
                    await ai_client.close()
                    
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
