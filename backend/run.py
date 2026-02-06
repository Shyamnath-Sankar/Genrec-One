"""
Run script for HRMS Backend API
Usage: python run.py [--reload] [--host HOST] [--port PORT]
"""
import argparse
import uvicorn
from app.core.config import settings


def main():
    parser = argparse.ArgumentParser(description="Run HRMS Backend API")
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development",
    )
    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (default: 1)",
    )

    args = parser.parse_args()

    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Server running at http://{args.host}:{args.port}")
    print("Press CTRL+C to stop")

    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else 1,
        log_level="info",
    )


if __name__ == "__main__":
    main()
