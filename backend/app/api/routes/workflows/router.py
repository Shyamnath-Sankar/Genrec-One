"""
Workflow & Approval Management API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.workflow import (
    WorkflowDefinition, WorkflowStep, ApprovalRequest, ApprovalAction,
    ApprovalDelegation, WorkflowType, ApproverType
)
from app.models.attendance import ApprovalStatus
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/workflows", tags=["Workflows"])


# ==================== SCHEMAS ====================

class WorkflowStepCreate(BaseModel):
    step_order: int
    name: str
    approver_type: ApproverType
    specific_role_id: Optional[str] = None
    specific_employee_id: Optional[str] = None
    is_mandatory: bool = True
    can_skip_if_same_approver: bool = True
    auto_approve_after_hours: Optional[int] = None
    escalate_after_hours: Optional[int] = None
    conditions: Optional[dict] = None


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workflow_type: WorkflowType
    priority: int = 0
    conditions: Optional[dict] = None
    steps: List[WorkflowStepCreate]


class ApprovalActionRequest(BaseModel):
    status: str  # approved, rejected
    remarks: Optional[str] = None


class DelegationCreate(BaseModel):
    delegate_id: str
    workflow_types: Optional[List[str]] = None
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None


# ==================== WORKFLOW DEFINITIONS ====================

@router.get("/definitions", response_model=DataResponse)
async def get_workflow_definitions(
    workflow_type: Optional[WorkflowType] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all workflow definitions for the company"""
    query = select(WorkflowDefinition).where(
        WorkflowDefinition.company_id == current_employee.company_id,
        WorkflowDefinition.is_active == True
    ).options(selectinload(WorkflowDefinition.steps))
    
    if workflow_type:
        query = query.where(WorkflowDefinition.workflow_type == workflow_type)
    
    query = query.order_by(WorkflowDefinition.priority.desc(), WorkflowDefinition.name)
    
    result = await db.execute(query)
    workflows = result.scalars().all()
    
    data = [
        {
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "workflow_type": w.workflow_type.value,
            "priority": w.priority,
            "conditions": w.conditions,
            "is_active": w.is_active,
            "steps": [
                {
                    "id": s.id,
                    "step_order": s.step_order,
                    "name": s.name,
                    "approver_type": s.approver_type.value,
                    "is_mandatory": s.is_mandatory,
                    "can_skip_if_same_approver": s.can_skip_if_same_approver,
                    "auto_approve_after_hours": s.auto_approve_after_hours,
                    "escalate_after_hours": s.escalate_after_hours,
                }
                for s in sorted(w.steps, key=lambda x: x.step_order)
            ],
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in workflows
    ]
    
    return DataResponse(data=data)


@router.post("/definitions", response_model=DataResponse)
async def create_workflow_definition(
    data: WorkflowCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workflow definition"""
    workflow = WorkflowDefinition(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        name=data.name,
        description=data.description,
        workflow_type=data.workflow_type,
        priority=data.priority,
        conditions=data.conditions,
        is_active=True,
    )
    db.add(workflow)
    
    # Add steps
    for step_data in data.steps:
        step = WorkflowStep(
            id=str(uuid.uuid4()),
            workflow_id=workflow.id,
            step_order=step_data.step_order,
            name=step_data.name,
            approver_type=step_data.approver_type,
            specific_role_id=step_data.specific_role_id,
            specific_employee_id=step_data.specific_employee_id,
            is_mandatory=step_data.is_mandatory,
            can_skip_if_same_approver=step_data.can_skip_if_same_approver,
            auto_approve_after_hours=step_data.auto_approve_after_hours,
            escalate_after_hours=step_data.escalate_after_hours,
            conditions=step_data.conditions,
        )
        db.add(step)
    
    await db.commit()
    
    return DataResponse(
        message="Workflow created successfully",
        data={"id": workflow.id}
    )


@router.put("/definitions/{workflow_id}/toggle", response_model=DataResponse)
async def toggle_workflow_definition(
    workflow_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Toggle workflow active status"""
    result = await db.execute(
        select(WorkflowDefinition).where(
            WorkflowDefinition.id == workflow_id,
            WorkflowDefinition.company_id == current_employee.company_id
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow.is_active = not workflow.is_active
    await db.commit()
    
    return DataResponse(
        message=f"Workflow {'activated' if workflow.is_active else 'deactivated'} successfully",
        data={"id": workflow.id, "is_active": workflow.is_active}
    )


# ==================== PENDING APPROVALS ====================

@router.get("/pending", response_model=PaginatedResponse)
async def get_pending_approvals(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    module: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all pending approvals for the current employee"""
    # Get pending approval actions where current employee is the approver
    query = select(ApprovalAction).join(ApprovalRequest).where(
        ApprovalAction.approver_id == current_employee.id,
        ApprovalAction.status == ApprovalStatus.PENDING,
        ApprovalRequest.status == ApprovalStatus.PENDING
    ).options(selectinload(ApprovalAction.request))
    
    if module:
        query = query.where(ApprovalRequest.module == module)
    
    # Count total
    count_query = select(func.count()).select_from(ApprovalAction).join(ApprovalRequest).where(
        ApprovalAction.approver_id == current_employee.id,
        ApprovalAction.status == ApprovalStatus.PENDING,
        ApprovalRequest.status == ApprovalStatus.PENDING
    )
    if module:
        count_query = count_query.where(ApprovalRequest.module == module)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get paginated results
    query = query.order_by(ApprovalAction.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    actions = result.scalars().all()
    
    data = [
        {
            "id": a.id,
            "request_id": a.request_id,
            "step_number": a.step_number,
            "module": a.request.module,
            "entity_type": a.request.entity_type,
            "entity_id": a.request.entity_id,
            "summary": a.request.summary,
            "current_step": a.request.current_step,
            "total_steps": a.request.total_steps,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in actions
    ]
    
    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


@router.post("/approve/{action_id}", response_model=DataResponse)
async def approve_request(
    action_id: str,
    data: ApprovalActionRequest,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a pending request"""
    result = await db.execute(
        select(ApprovalAction).options(
            selectinload(ApprovalAction.request)
        ).where(
            ApprovalAction.id == action_id,
            ApprovalAction.approver_id == current_employee.id,
            ApprovalAction.status == ApprovalStatus.PENDING
        )
    )
    action = result.scalar_one_or_none()
    
    if not action:
        raise HTTPException(status_code=404, detail="Approval action not found or already processed")
    
    # Update the action
    action.status = ApprovalStatus.APPROVED if data.status == "approved" else ApprovalStatus.REJECTED
    action.remarks = data.remarks
    action.action_at = datetime.utcnow()
    
    request = action.request
    
    if data.status == "rejected":
        # Reject the entire request
        request.status = ApprovalStatus.REJECTED
        request.final_approver_id = current_employee.id
        request.final_remarks = data.remarks
        request.completed_at = datetime.utcnow()
    else:
        # Check if this was the last step
        if action.step_number >= request.total_steps:
            # Fully approved
            request.status = ApprovalStatus.APPROVED
            request.final_approver_id = current_employee.id
            request.final_remarks = data.remarks
            request.completed_at = datetime.utcnow()
        else:
            # Move to next step
            request.current_step = action.step_number + 1
            # TODO: Create next approval action based on workflow steps
    
    await db.commit()
    
    return DataResponse(
        message=f"Request {data.status} successfully",
        data={"id": action.id, "request_status": request.status.value}
    )


# ==================== MY REQUESTS ====================

@router.get("/my-requests", response_model=PaginatedResponse)
async def get_my_requests(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[ApprovalStatus] = None,
    module: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get all approval requests submitted by the current employee"""
    query = select(ApprovalRequest).where(
        ApprovalRequest.requester_id == current_employee.id
    ).options(selectinload(ApprovalRequest.approvals))
    
    if status:
        query = query.where(ApprovalRequest.status == status)
    if module:
        query = query.where(ApprovalRequest.module == module)
    
    # Count total
    count_query = select(func.count()).select_from(ApprovalRequest).where(
        ApprovalRequest.requester_id == current_employee.id
    )
    if status:
        count_query = count_query.where(ApprovalRequest.status == status)
    if module:
        count_query = count_query.where(ApprovalRequest.module == module)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    query = query.order_by(ApprovalRequest.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    requests = result.scalars().all()
    
    data = [
        {
            "id": r.id,
            "module": r.module,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "summary": r.summary,
            "current_step": r.current_step,
            "total_steps": r.total_steps,
            "status": r.status.value,
            "approvals": [
                {
                    "step_number": a.step_number,
                    "status": a.status.value,
                    "remarks": a.remarks,
                    "action_at": a.action_at.isoformat() if a.action_at else None,
                }
                for a in sorted(r.approvals, key=lambda x: x.step_number)
            ],
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in requests
    ]
    
    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


# ==================== DELEGATIONS ====================

@router.get("/delegations", response_model=DataResponse)
async def get_delegations(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get approval delegations for the current employee"""
    result = await db.execute(
        select(ApprovalDelegation).where(
            or_(
                ApprovalDelegation.delegator_id == current_employee.id,
                ApprovalDelegation.delegate_id == current_employee.id
            ),
            ApprovalDelegation.is_active == True
        )
    )
    delegations = result.scalars().all()
    
    data = [
        {
            "id": d.id,
            "delegator_id": d.delegator_id,
            "delegate_id": d.delegate_id,
            "workflow_types": d.workflow_types,
            "start_date": d.start_date.isoformat(),
            "end_date": d.end_date.isoformat(),
            "reason": d.reason,
            "is_active": d.is_active,
            "is_delegated_by_me": d.delegator_id == current_employee.id,
        }
        for d in delegations
    ]
    
    return DataResponse(data=data)


@router.post("/delegations", response_model=DataResponse)
async def create_delegation(
    data: DelegationCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create an approval delegation"""
    if data.delegate_id == current_employee.id:
        raise HTTPException(status_code=400, detail="Cannot delegate to yourself")
    
    delegation = ApprovalDelegation(
        id=str(uuid.uuid4()),
        delegator_id=current_employee.id,
        delegate_id=data.delegate_id,
        workflow_types=data.workflow_types,
        start_date=data.start_date,
        end_date=data.end_date,
        reason=data.reason,
        is_active=True,
    )
    db.add(delegation)
    await db.commit()
    
    return DataResponse(
        message="Delegation created successfully",
        data={"id": delegation.id}
    )


@router.delete("/delegations/{delegation_id}", response_model=DataResponse)
async def cancel_delegation(
    delegation_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a delegation"""
    result = await db.execute(
        select(ApprovalDelegation).where(
            ApprovalDelegation.id == delegation_id,
            ApprovalDelegation.delegator_id == current_employee.id
        )
    )
    delegation = result.scalar_one_or_none()
    
    if not delegation:
        raise HTTPException(status_code=404, detail="Delegation not found")
    
    delegation.is_active = False
    await db.commit()
    
    return DataResponse(message="Delegation cancelled successfully")


# ==================== APPROVAL HISTORY ====================

@router.get("/history", response_model=PaginatedResponse)
async def get_approval_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    module: Optional[str] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get approval history (approved/rejected by current employee)"""
    query = select(ApprovalAction).join(ApprovalRequest).where(
        ApprovalAction.approver_id == current_employee.id,
        ApprovalAction.status != ApprovalStatus.PENDING
    ).options(selectinload(ApprovalAction.request))
    
    if module:
        query = query.where(ApprovalRequest.module == module)
    
    count_query = select(func.count()).select_from(ApprovalAction).join(ApprovalRequest).where(
        ApprovalAction.approver_id == current_employee.id,
        ApprovalAction.status != ApprovalStatus.PENDING
    )
    if module:
        count_query = count_query.where(ApprovalRequest.module == module)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    query = query.order_by(ApprovalAction.action_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    actions = result.scalars().all()
    
    data = [
        {
            "id": a.id,
            "request_id": a.request_id,
            "module": a.request.module,
            "entity_type": a.request.entity_type,
            "entity_id": a.request.entity_id,
            "summary": a.request.summary,
            "status": a.status.value,
            "remarks": a.remarks,
            "action_at": a.action_at.isoformat() if a.action_at else None,
        }
        for a in actions
    ]
    
    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )
