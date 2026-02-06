"""
Employee Engagement API Routes
Surveys, Recognition, Social Feed, Celebrations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.security import get_current_employee
from app.models.employee import Employee
from app.models.engagement import (
    Survey, SurveyQuestion, SurveyResponse, SurveyAnswer,
    Badge, Recognition, RecognitionLike,
    Post, PostComment, PostLike, PollVote,
    CompanyValue, Celebration, CelebrationWish,
    SurveyType, QuestionType, SurveyStatus, BadgeCategory, PostType
)
from app.schemas.auth import DataResponse, PaginatedResponse

router = APIRouter(prefix="/engagement", tags=["Engagement"])


# ==================== SCHEMAS ====================

class SurveyQuestionCreate(BaseModel):
    order: int
    question_text: str
    question_type: QuestionType
    options: Optional[dict] = None
    is_required: bool = True
    min_value: Optional[int] = None
    max_value: Optional[int] = None


class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    survey_type: SurveyType
    is_anonymous: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_all: bool = True
    target_departments: Optional[List[str]] = None
    questions: List[SurveyQuestionCreate]


class SurveyAnswerSubmit(BaseModel):
    question_id: str
    text_answer: Optional[str] = None
    number_answer: Optional[float] = None
    choice_answer: Optional[str] = None
    choices_answer: Optional[List[str]] = None


class SurveySubmit(BaseModel):
    answers: List[SurveyAnswerSubmit]


class RecognitionCreate(BaseModel):
    receiver_id: str
    badge_id: Optional[str] = None
    message: str
    values: Optional[List[str]] = None
    is_public: bool = True


class PostCreate(BaseModel):
    content: str
    post_type: PostType = PostType.UPDATE
    attachments: Optional[dict] = None
    poll_options: Optional[List[dict]] = None
    poll_end_date: Optional[datetime] = None
    event_date: Optional[datetime] = None
    event_location: Optional[str] = None


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None


# ==================== SURVEYS ====================

@router.get("/surveys", response_model=DataResponse)
async def get_surveys(
    status: Optional[SurveyStatus] = None,
    survey_type: Optional[SurveyType] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get surveys for the company"""
    query = select(Survey).where(
        Survey.company_id == current_employee.company_id
    ).options(selectinload(Survey.questions))
    
    if status:
        query = query.where(Survey.status == status)
    if survey_type:
        query = query.where(Survey.survey_type == survey_type)
    
    query = query.order_by(Survey.created_at.desc())
    
    result = await db.execute(query)
    surveys = result.scalars().all()
    
    data = [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "survey_type": s.survey_type.value,
            "status": s.status.value,
            "is_anonymous": s.is_anonymous,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "question_count": len(s.questions),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in surveys
    ]
    
    return DataResponse(data=data)


@router.get("/surveys/my-pending", response_model=DataResponse)
async def get_my_pending_surveys(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get active surveys that the current employee hasn't completed"""
    now = datetime.utcnow()
    
    # Get active surveys
    active_surveys = await db.execute(
        select(Survey).where(
            Survey.company_id == current_employee.company_id,
            Survey.status == SurveyStatus.ACTIVE,
            or_(Survey.end_date.is_(None), Survey.end_date > now)
        ).options(selectinload(Survey.questions))
    )
    surveys = active_surveys.scalars().all()
    
    # Filter out completed ones
    pending = []
    for survey in surveys:
        # Check if employee has already responded
        response_check = await db.execute(
            select(SurveyResponse).where(
                SurveyResponse.survey_id == survey.id,
                SurveyResponse.employee_id == current_employee.id,
                SurveyResponse.is_complete == True
            )
        )
        if not response_check.scalar_one_or_none():
            # Check if employee is in target
            is_targeted = survey.target_all
            if not is_targeted and survey.target_departments:
                is_targeted = current_employee.department_id in survey.target_departments
            if not is_targeted and survey.target_employees:
                is_targeted = current_employee.id in survey.target_employees
            
            if is_targeted:
                pending.append({
                    "id": survey.id,
                    "title": survey.title,
                    "description": survey.description,
                    "survey_type": survey.survey_type.value,
                    "question_count": len(survey.questions),
                    "end_date": survey.end_date.isoformat() if survey.end_date else None,
                })
    
    return DataResponse(data=pending)


@router.get("/surveys/{survey_id}", response_model=DataResponse)
async def get_survey_details(
    survey_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get survey details with questions"""
    result = await db.execute(
        select(Survey).where(
            Survey.id == survey_id,
            Survey.company_id == current_employee.company_id
        ).options(selectinload(Survey.questions))
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    data = {
        "id": survey.id,
        "title": survey.title,
        "description": survey.description,
        "survey_type": survey.survey_type.value,
        "status": survey.status.value,
        "is_anonymous": survey.is_anonymous,
        "questions": [
            {
                "id": q.id,
                "order": q.order,
                "question_text": q.question_text,
                "question_type": q.question_type.value,
                "options": q.options,
                "is_required": q.is_required,
                "min_value": q.min_value,
                "max_value": q.max_value,
            }
            for q in sorted(survey.questions, key=lambda x: x.order)
        ],
    }
    
    return DataResponse(data=data)


@router.post("/surveys", response_model=DataResponse)
async def create_survey(
    data: SurveyCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new survey"""
    survey = Survey(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        created_by_id=current_employee.id,
        title=data.title,
        description=data.description,
        survey_type=data.survey_type,
        status=SurveyStatus.DRAFT,
        is_anonymous=data.is_anonymous,
        start_date=data.start_date,
        end_date=data.end_date,
        target_all=data.target_all,
        target_departments=data.target_departments,
    )
    db.add(survey)
    
    for q_data in data.questions:
        question = SurveyQuestion(
            id=str(uuid.uuid4()),
            survey_id=survey.id,
            order=q_data.order,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            options=q_data.options,
            is_required=q_data.is_required,
            min_value=q_data.min_value,
            max_value=q_data.max_value,
        )
        db.add(question)
    
    await db.commit()
    
    return DataResponse(
        message="Survey created successfully",
        data={"id": survey.id}
    )


@router.post("/surveys/{survey_id}/publish", response_model=DataResponse)
async def publish_survey(
    survey_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Publish a survey"""
    result = await db.execute(
        select(Survey).where(
            Survey.id == survey_id,
            Survey.company_id == current_employee.company_id
        )
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    survey.status = SurveyStatus.ACTIVE
    if not survey.start_date:
        survey.start_date = datetime.utcnow()
    
    await db.commit()
    
    return DataResponse(message="Survey published successfully")


@router.post("/surveys/{survey_id}/submit", response_model=DataResponse)
async def submit_survey_response(
    survey_id: str,
    data: SurveySubmit,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Submit a survey response"""
    result = await db.execute(
        select(Survey).where(
            Survey.id == survey_id,
            Survey.status == SurveyStatus.ACTIVE
        )
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found or not active")
    
    # Create response
    response = SurveyResponse(
        id=str(uuid.uuid4()),
        survey_id=survey_id,
        employee_id=None if survey.is_anonymous else current_employee.id,
        is_complete=True,
        submitted_at=datetime.utcnow(),
    )
    db.add(response)
    
    # Add answers
    for ans in data.answers:
        answer = SurveyAnswer(
            id=str(uuid.uuid4()),
            response_id=response.id,
            question_id=ans.question_id,
            text_answer=ans.text_answer,
            number_answer=ans.number_answer,
            choice_answer=ans.choice_answer,
            choices_answer=ans.choices_answer,
        )
        db.add(answer)
    
    await db.commit()
    
    return DataResponse(message="Survey response submitted successfully")


@router.get("/surveys/{survey_id}/results", response_model=DataResponse)
async def get_survey_results(
    survey_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get survey results (aggregated)"""
    result = await db.execute(
        select(Survey).where(
            Survey.id == survey_id,
            Survey.company_id == current_employee.company_id
        ).options(
            selectinload(Survey.questions),
            selectinload(Survey.responses).selectinload(SurveyResponse.answers)
        )
    )
    survey = result.scalar_one_or_none()
    
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    
    # Aggregate results
    total_responses = len([r for r in survey.responses if r.is_complete])
    
    question_results = []
    for question in sorted(survey.questions, key=lambda x: x.order):
        answers = []
        for response in survey.responses:
            if response.is_complete:
                for answer in response.answers:
                    if answer.question_id == question.id:
                        answers.append(answer)
        
        result_data = {
            "question_id": question.id,
            "question_text": question.question_text,
            "question_type": question.question_type.value,
            "response_count": len(answers),
        }
        
        if question.question_type in [QuestionType.RATING, QuestionType.NPS]:
            numbers = [a.number_answer for a in answers if a.number_answer is not None]
            if numbers:
                result_data["average"] = sum(numbers) / len(numbers)
                result_data["distribution"] = {}
                for n in numbers:
                    key = str(int(n))
                    result_data["distribution"][key] = result_data["distribution"].get(key, 0) + 1
                
                # Calculate NPS if applicable
                if question.question_type == QuestionType.NPS:
                    promoters = len([n for n in numbers if n >= 9])
                    detractors = len([n for n in numbers if n <= 6])
                    result_data["nps"] = ((promoters - detractors) / len(numbers)) * 100
        
        elif question.question_type == QuestionType.SINGLE_CHOICE:
            result_data["distribution"] = {}
            for a in answers:
                if a.choice_answer:
                    result_data["distribution"][a.choice_answer] = result_data["distribution"].get(a.choice_answer, 0) + 1
        
        question_results.append(result_data)
    
    return DataResponse(data={
        "survey_id": survey.id,
        "title": survey.title,
        "total_responses": total_responses,
        "results": question_results,
    })


# ==================== RECOGNITION ====================

@router.get("/badges", response_model=DataResponse)
async def get_badges(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get available recognition badges"""
    result = await db.execute(
        select(Badge).where(
            Badge.company_id == current_employee.company_id,
            Badge.is_active == True
        ).order_by(Badge.category, Badge.name)
    )
    badges = result.scalars().all()
    
    data = [
        {
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "color": b.color,
            "category": b.category.value,
            "points": b.points,
        }
        for b in badges
    ]
    
    return DataResponse(data=data)


@router.post("/badges", response_model=DataResponse)
async def create_badge(
    name: str,
    category: BadgeCategory,
    description: Optional[str] = None,
    icon: Optional[str] = None,
    color: Optional[str] = None,
    points: int = 0,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new badge"""
    badge = Badge(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        name=name,
        description=description,
        icon=icon,
        color=color,
        category=category,
        points=points,
        is_active=True,
    )
    db.add(badge)
    await db.commit()
    
    return DataResponse(
        message="Badge created successfully",
        data={"id": badge.id}
    )


@router.get("/recognitions", response_model=PaginatedResponse)
async def get_recognitions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get public recognitions feed"""
    query = select(Recognition).where(
        Recognition.company_id == current_employee.company_id,
        Recognition.is_public == True
    ).options(
        selectinload(Recognition.giver),
        selectinload(Recognition.receiver),
        selectinload(Recognition.badge)
    )
    
    count_result = await db.execute(
        select(func.count()).select_from(Recognition).where(
            Recognition.company_id == current_employee.company_id,
            Recognition.is_public == True
        )
    )
    total = count_result.scalar() or 0
    
    query = query.order_by(Recognition.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    recognitions = result.scalars().all()
    
    data = [
        {
            "id": r.id,
            "giver": {
                "id": r.giver.id,
                "name": f"{r.giver.first_name} {r.giver.last_name}",
                "photo": r.giver.photo,
            },
            "receiver": {
                "id": r.receiver.id,
                "name": f"{r.receiver.first_name} {r.receiver.last_name}",
                "photo": r.receiver.photo,
            },
            "badge": {
                "id": r.badge.id,
                "name": r.badge.name,
                "icon": r.badge.icon,
                "color": r.badge.color,
            } if r.badge else None,
            "message": r.message,
            "values": r.values,
            "like_count": r.like_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recognitions
    ]
    
    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


@router.post("/recognitions", response_model=DataResponse)
async def give_recognition(
    data: RecognitionCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Give recognition to another employee"""
    if data.receiver_id == current_employee.id:
        raise HTTPException(status_code=400, detail="Cannot give recognition to yourself")
    
    recognition = Recognition(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        giver_id=current_employee.id,
        receiver_id=data.receiver_id,
        badge_id=data.badge_id,
        message=data.message,
        values=data.values,
        is_public=data.is_public,
        like_count=0,
    )
    db.add(recognition)
    
    # Optionally create a post for public recognitions
    if data.is_public:
        # Get receiver name
        receiver_result = await db.execute(
            select(Employee).where(Employee.id == data.receiver_id)
        )
        receiver = receiver_result.scalar_one_or_none()
        
        if receiver:
            post = Post(
                id=str(uuid.uuid4()),
                company_id=current_employee.company_id,
                author_id=current_employee.id,
                post_type=PostType.RECOGNITION,
                content=f"Recognized {receiver.first_name} {receiver.last_name}: {data.message}",
                visible_to_all=True,
            )
            db.add(post)
    
    await db.commit()
    
    return DataResponse(
        message="Recognition given successfully",
        data={"id": recognition.id}
    )


@router.post("/recognitions/{recognition_id}/like", response_model=DataResponse)
async def like_recognition(
    recognition_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Like a recognition"""
    # Check if already liked
    existing = await db.execute(
        select(RecognitionLike).where(
            RecognitionLike.recognition_id == recognition_id,
            RecognitionLike.employee_id == current_employee.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already liked")
    
    like = RecognitionLike(
        id=str(uuid.uuid4()),
        recognition_id=recognition_id,
        employee_id=current_employee.id,
    )
    db.add(like)
    
    # Update like count
    await db.execute(
        select(Recognition).where(Recognition.id == recognition_id)
    )
    recognition = (await db.execute(
        select(Recognition).where(Recognition.id == recognition_id)
    )).scalar_one_or_none()
    if recognition:
        recognition.like_count = (recognition.like_count or 0) + 1
    
    await db.commit()
    
    return DataResponse(message="Recognition liked successfully")


@router.get("/my-recognitions", response_model=DataResponse)
async def get_my_recognitions(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get recognitions received by current employee"""
    result = await db.execute(
        select(Recognition).where(
            Recognition.receiver_id == current_employee.id
        ).options(
            selectinload(Recognition.giver),
            selectinload(Recognition.badge)
        ).order_by(Recognition.created_at.desc())
    )
    recognitions = result.scalars().all()
    
    # Count by badge
    badge_counts = {}
    for r in recognitions:
        if r.badge:
            badge_counts[r.badge.name] = badge_counts.get(r.badge.name, 0) + 1
    
    data = {
        "total_received": len(recognitions),
        "badge_counts": badge_counts,
        "recent": [
            {
                "id": r.id,
                "giver": {
                    "id": r.giver.id,
                    "name": f"{r.giver.first_name} {r.giver.last_name}",
                },
                "badge": r.badge.name if r.badge else None,
                "message": r.message,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recognitions[:10]
        ],
    }
    
    return DataResponse(data=data)


# ==================== SOCIAL FEED ====================

@router.get("/feed", response_model=PaginatedResponse)
async def get_feed(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    post_type: Optional[PostType] = None,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get social feed posts"""
    query = select(Post).where(
        Post.company_id == current_employee.company_id,
        or_(
            Post.visible_to_all == True,
            Post.visible_to_departments.contains([current_employee.department_id])
        )
    ).options(
        selectinload(Post.author),
        selectinload(Post.comments).selectinload(PostComment.author)
    )
    
    if post_type:
        query = query.where(Post.post_type == post_type)
    
    count_result = await db.execute(
        select(func.count()).select_from(Post).where(
            Post.company_id == current_employee.company_id,
            or_(
                Post.visible_to_all == True,
                Post.visible_to_departments.contains([current_employee.department_id])
            )
        )
    )
    total = count_result.scalar() or 0
    
    # Pinned posts first, then by date
    query = query.order_by(Post.is_pinned.desc(), Post.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    data = [
        {
            "id": p.id,
            "author": {
                "id": p.author.id,
                "name": f"{p.author.first_name} {p.author.last_name}",
                "photo": p.author.photo,
            },
            "post_type": p.post_type.value,
            "content": p.content,
            "attachments": p.attachments,
            "poll_options": p.poll_options,
            "poll_end_date": p.poll_end_date.isoformat() if p.poll_end_date else None,
            "event_date": p.event_date.isoformat() if p.event_date else None,
            "event_location": p.event_location,
            "is_pinned": p.is_pinned,
            "like_count": p.like_count,
            "comment_count": p.comment_count,
            "comments": [
                {
                    "id": c.id,
                    "author": {
                        "id": c.author.id,
                        "name": f"{c.author.first_name} {c.author.last_name}",
                    },
                    "content": c.content,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                }
                for c in sorted(p.comments, key=lambda x: x.created_at)[:5]
            ],
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]
    
    return PaginatedResponse(
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=(total + per_page - 1) // per_page
    )


@router.post("/posts", response_model=DataResponse)
async def create_post(
    data: PostCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Create a new post"""
    post = Post(
        id=str(uuid.uuid4()),
        company_id=current_employee.company_id,
        author_id=current_employee.id,
        post_type=data.post_type,
        content=data.content,
        attachments=data.attachments,
        poll_options=data.poll_options,
        poll_end_date=data.poll_end_date,
        event_date=data.event_date,
        event_location=data.event_location,
        visible_to_all=True,
        like_count=0,
        comment_count=0,
    )
    db.add(post)
    await db.commit()
    
    return DataResponse(
        message="Post created successfully",
        data={"id": post.id}
    )


@router.post("/posts/{post_id}/like", response_model=DataResponse)
async def like_post(
    post_id: str,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Like a post"""
    existing = await db.execute(
        select(PostLike).where(
            PostLike.post_id == post_id,
            PostLike.employee_id == current_employee.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already liked")
    
    like = PostLike(
        id=str(uuid.uuid4()),
        post_id=post_id,
        employee_id=current_employee.id,
    )
    db.add(like)
    
    # Update like count
    post = (await db.execute(
        select(Post).where(Post.id == post_id)
    )).scalar_one_or_none()
    if post:
        post.like_count = (post.like_count or 0) + 1
    
    await db.commit()
    
    return DataResponse(message="Post liked successfully")


@router.post("/posts/{post_id}/comments", response_model=DataResponse)
async def add_comment(
    post_id: str,
    data: CommentCreate,
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a post"""
    comment = PostComment(
        id=str(uuid.uuid4()),
        post_id=post_id,
        author_id=current_employee.id,
        parent_id=data.parent_id,
        content=data.content,
    )
    db.add(comment)
    
    # Update comment count
    post = (await db.execute(
        select(Post).where(Post.id == post_id)
    )).scalar_one_or_none()
    if post:
        post.comment_count = (post.comment_count or 0) + 1
    
    await db.commit()
    
    return DataResponse(
        message="Comment added successfully",
        data={"id": comment.id}
    )


# ==================== COMPANY VALUES ====================

@router.get("/values", response_model=DataResponse)
async def get_company_values(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get company values"""
    result = await db.execute(
        select(CompanyValue).where(
            CompanyValue.company_id == current_employee.company_id,
            CompanyValue.is_active == True
        ).order_by(CompanyValue.order)
    )
    values = result.scalars().all()
    
    data = [
        {
            "id": v.id,
            "name": v.name,
            "description": v.description,
            "icon": v.icon,
            "color": v.color,
        }
        for v in values
    ]
    
    return DataResponse(data=data)


# ==================== CELEBRATIONS ====================

@router.get("/celebrations/today", response_model=DataResponse)
async def get_todays_celebrations(
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get today's celebrations (birthdays, anniversaries)"""
    today = date.today()
    
    # Get employees with birthdays today
    result = await db.execute(
        select(Employee).where(
            Employee.company_id == current_employee.company_id,
            func.extract('month', Employee.date_of_birth) == today.month,
            func.extract('day', Employee.date_of_birth) == today.day
        )
    )
    birthday_employees = result.scalars().all()
    
    # Get employees with work anniversaries today
    result = await db.execute(
        select(Employee).where(
            Employee.company_id == current_employee.company_id,
            func.extract('month', Employee.date_of_joining) == today.month,
            func.extract('day', Employee.date_of_joining) == today.day,
            Employee.date_of_joining < today
        )
    )
    anniversary_employees = result.scalars().all()
    
    data = {
        "birthdays": [
            {
                "id": e.id,
                "name": f"{e.first_name} {e.last_name}",
                "photo": e.photo,
                "department": e.department.name if e.department else None,
            }
            for e in birthday_employees
        ],
        "work_anniversaries": [
            {
                "id": e.id,
                "name": f"{e.first_name} {e.last_name}",
                "photo": e.photo,
                "department": e.department.name if e.department else None,
                "years": (today - e.date_of_joining).days // 365,
            }
            for e in anniversary_employees
        ],
    }
    
    return DataResponse(data=data)


@router.get("/celebrations/upcoming", response_model=DataResponse)
async def get_upcoming_celebrations(
    days: int = Query(7, ge=1, le=30),
    current_employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Get upcoming celebrations for the next X days"""
    today = date.today()
    
    # Get all active employees
    result = await db.execute(
        select(Employee).where(
            Employee.company_id == current_employee.company_id,
            Employee.date_of_birth.isnot(None)
        )
    )
    employees = result.scalars().all()
    
    upcoming_birthdays = []
    upcoming_anniversaries = []
    
    for emp in employees:
        if emp.date_of_birth:
            # Check if birthday is in next X days
            this_year_bday = emp.date_of_birth.replace(year=today.year)
            if this_year_bday < today:
                this_year_bday = emp.date_of_birth.replace(year=today.year + 1)
            
            days_until = (this_year_bday - today).days
            if 0 < days_until <= days:
                upcoming_birthdays.append({
                    "id": emp.id,
                    "name": f"{emp.first_name} {emp.last_name}",
                    "photo": emp.photo,
                    "date": this_year_bday.isoformat(),
                    "days_until": days_until,
                })
        
        if emp.date_of_joining:
            # Check if work anniversary is in next X days
            this_year_anniv = emp.date_of_joining.replace(year=today.year)
            if this_year_anniv < today:
                this_year_anniv = emp.date_of_joining.replace(year=today.year + 1)
            
            days_until = (this_year_anniv - today).days
            if 0 < days_until <= days:
                upcoming_anniversaries.append({
                    "id": emp.id,
                    "name": f"{emp.first_name} {emp.last_name}",
                    "photo": emp.photo,
                    "date": this_year_anniv.isoformat(),
                    "days_until": days_until,
                    "years": this_year_anniv.year - emp.date_of_joining.year,
                })
    
    # Sort by days until
    upcoming_birthdays.sort(key=lambda x: x["days_until"])
    upcoming_anniversaries.sort(key=lambda x: x["days_until"])
    
    return DataResponse(data={
        "birthdays": upcoming_birthdays,
        "work_anniversaries": upcoming_anniversaries,
    })
