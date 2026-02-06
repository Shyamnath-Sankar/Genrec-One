"""
Professional logging configuration for HRMS Backend.
Provides structured, production-ready logging with proper formatting.
"""
import logging
import logging.handlers
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
from app.core.config import settings


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for terminal output."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        # Add color to level name for terminal
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{self.RESET}"
        
        # Format timestamp
        record.asctime = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        return super().format(record)


class StructuredFormatter(logging.Formatter):
    """Structured formatter for production logs (JSON-like format)."""
    
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
        
        log_entry = {
            "timestamp": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, 'request_id'):
            log_entry["request_id"] = record.request_id
        if hasattr(record, 'user_id'):
            log_entry["user_id"] = record.user_id
        if hasattr(record, 'duration_ms'):
            log_entry["duration_ms"] = record.duration_ms
            
        # Simple key=value format for readability
        parts = [f"[{log_entry['timestamp']}]", f"[{record.levelname:8}]"]
        
        if 'request_id' in log_entry:
            parts.append(f"[{log_entry['request_id'][:8]}]")
            
        parts.append(f"[{record.name}]")
        parts.append(log_entry['message'])
        
        if 'duration_ms' in log_entry:
            parts.append(f"({log_entry['duration_ms']}ms)")
            
        result = " ".join(parts)
        
        if 'exception' in log_entry:
            result += f"\n{log_entry['exception']}"
            
        return result


def setup_logging(log_level: Optional[str] = None) -> logging.Logger:
    """
    Configure application logging.
    
    Args:
        log_level: Override log level (defaults to DEBUG in dev, INFO in prod)
        
    Returns:
        The root application logger
    """
    # Determine log level
    if log_level:
        level = getattr(logging, log_level.upper(), logging.INFO)
    else:
        level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Create logs directory if needed
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Console handler with colors (for development)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    if settings.DEBUG:
        # Pretty format for development
        console_format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        console_handler.setFormatter(ColoredFormatter(console_format))
    else:
        # Structured format for production
        console_handler.setFormatter(StructuredFormatter())
    
    root_logger.addHandler(console_handler)
    
    # File handler for persistent logs (rotating)
    file_handler = logging.handlers.RotatingFileHandler(
        logs_dir / "hrms.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8',
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(file_handler)
    
    # Error file handler (for errors only)
    error_handler = logging.handlers.RotatingFileHandler(
        logs_dir / "hrms-errors.log",
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding='utf-8',
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(error_handler)
    
    # Configure SQLAlchemy logging
    sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
    sqlalchemy_logger.setLevel(logging.WARNING)  # Only warnings and errors
    
    # Suppress noisy loggers
    logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    
    # Configure uvicorn logging
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(logging.INFO)
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.setLevel(logging.INFO)
    
    # Application logger
    app_logger = logging.getLogger("hrms")
    app_logger.setLevel(level)
    
    app_logger.info(f"Logging initialized at level {logging.getLevelName(level)}")
    
    return app_logger


def get_logger(name: str) -> logging.Logger:
    """Get a logger with the given name under the hrms namespace."""
    return logging.getLogger(f"hrms.{name}")


# Request context logger adapter
class RequestContextAdapter(logging.LoggerAdapter):
    """Logger adapter that adds request context to log messages."""
    
    def process(self, msg: str, kwargs: dict):
        extra = kwargs.get('extra', {})
        if self.extra:
            extra.update(self.extra)
        kwargs['extra'] = extra
        return msg, kwargs
