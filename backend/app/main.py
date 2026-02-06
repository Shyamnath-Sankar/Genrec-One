from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import uuid

from app.core.config import settings
from app.core.database import async_engine, Base
from app.core.logging_config import setup_logging, get_logger
from app.api.routes.auth.router import router as auth_router
from app.api.routes.employees.router import router as employees_router
from app.api.routes.attendance.router import router as attendance_router
from app.api.routes.leaves.router import router as leaves_router
from app.api.routes.payroll.router import router as payroll_router
from app.api.routes.timesheets.router import router as timesheets_router
from app.api.routes.recruitment.router import router as recruitment_router
from app.api.routes.performance.router import router as performance_router
from app.api.routes.expenses.router import router as expenses_router
from app.api.routes.assets.router import router as assets_router
from app.api.routes.tickets.router import router as tickets_router
from app.api.routes.travel.router import router as travel_router
from app.api.routes.documents.router import router as documents_router
from app.api.routes.reports.router import router as reports_router
from app.api.routes.settings.router import router as settings_router
# New routers
from app.api.routes.workflows.router import router as workflows_router
from app.api.routes.engagement.router import router as engagement_router
from app.api.routes.analytics.router import router as analytics_router
from app.api.routes.shifts.router import router as shifts_router

# Initialize logging
logger = setup_logging()
api_logger = get_logger("api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    yield
    # Shutdown
    logger.info("Shutting down HRMS API...")
    await async_engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Complete Human Resource Management System API",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing information."""
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    # Add request ID to state for access in handlers
    request.state.request_id = request_id
    
    # Log request
    api_logger.info(
        f"[{request_id}] {request.method} {request.url.path}"
    )
    
    try:
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        # Log response
        log_level = "warning" if response.status_code >= 400 else "info"
        getattr(api_logger, log_level)(
            f"[{request_id}] {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
        )
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
        
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        api_logger.error(
            f"[{request_id}] {request.method} {request.url.path} -> ERROR ({duration_ms}ms): {str(e)}"
        )
        raise


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    api_logger.exception(
        f"[{request_id}] Unhandled exception: {str(exc)}"
    )
    
    # Return a clean error response
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred",
            "request_id": request_id,
        },
    )


# Include routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(employees_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(leaves_router, prefix="/api/v1")
app.include_router(payroll_router, prefix="/api/v1")
app.include_router(timesheets_router, prefix="/api/v1")
app.include_router(recruitment_router, prefix="/api/v1")
app.include_router(performance_router, prefix="/api/v1")
app.include_router(expenses_router, prefix="/api/v1")
app.include_router(assets_router, prefix="/api/v1")
app.include_router(tickets_router, prefix="/api/v1")
app.include_router(travel_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
# New routers
app.include_router(workflows_router, prefix="/api/v1")
app.include_router(engagement_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(shifts_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/health")
async def api_health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
