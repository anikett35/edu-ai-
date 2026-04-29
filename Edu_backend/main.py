"""
main.py
───────
EduAI – AI Teaching Assistant
Production FastAPI application entry point.

Startup sequence:
  1. Load environment variables
  2. Connect to MongoDB Atlas
  3. Initialise ML models (loads or trains from seed data)
  4. Pre-load embedding model (sentence-transformer)
  5. Create uploads/ directory
  6. Mount all routers

Shutdown sequence:
  1. Close MongoDB connection
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from core.config import settings
from core.database import connect_db, close_db

# ── Routers ──────────────────────────────────────────────────────────────────
from routers import auth, teacher, tutor, quiz, analytics, subjects, intervention

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════════════
# LIFESPAN (replaces deprecated on_event)
# ════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Everything before `yield` runs on startup.
    Everything after `yield` runs on shutdown.
    """
    logger.info("🚀  EduAI backend starting up…")

    # 1. Ensure upload directory exists
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    logger.info("📁  Upload directory: %s", settings.upload_dir)

    # 2. Connect MongoDB (non-fatal — server still starts if DB is unreachable)
    try:
        await connect_db()
    except Exception as exc:
        logger.error("❌  MongoDB connection FAILED: %s", exc)
        logger.warning("⚠️  Server starting without DB — API calls will fail until DB is reachable")

    # ML models and embedding model load lazily on first request
    logger.info("✅  EduAI is ready to serve requests")
    yield

    # ── Shutdown ──────────────────────────────────────────────────────────
    logger.info("🛑  EduAI shutting down…")
    await close_db()


# ════════════════════════════════════════════════════════════════════════════
# APP INSTANCE
# ════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="EduAI – AI Teaching Assistant",
    description=(
        "Production-grade backend for an AI-powered education platform.\n\n"
        "Features: JWT auth, role-based access, PDF material upload, "
        "RAG-powered AI tutor (Ollama/Mistral), quiz system with ML difficulty "
        "classification, Random Forest score prediction, and MongoDB analytics."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE
# ════════════════════════════════════════════════════════════════════════════

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ════════════════════════════════════════════════════════════════════════════
# GLOBAL EXCEPTION HANDLERS
# ════════════════════════════════════════════════════════════════════════════

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Override FastAPI's default 422 handler to return a cleaner, structured error.
    Each error includes: field location, message, and invalid value.
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": " → ".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation failed",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — prevents stack traces leaking to clients."""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred"},
    )


# ════════════════════════════════════════════════════════════════════════════
# ROUTERS
# ════════════════════════════════════════════════════════════════════════════

app.include_router(auth.router)
app.include_router(teacher.router)
app.include_router(tutor.router)
app.include_router(quiz.router)
app.include_router(analytics.router)
app.include_router(subjects.router)
app.include_router(intervention.router)


# ════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK
# ════════════════════════════════════════════════════════════════════════════

@app.get("/health", tags=["System"], summary="Health check")
async def health():
    return {
        "status": "healthy",
        "service": "EduAI",
        "version": "1.0.0",
    }


@app.get("/", tags=["System"], summary="Root")
async def root():
    return {
        "message": "EduAI – AI Teaching Assistant API",
        "docs": "/docs",
        "health": "/health",
    }


# ════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,           # set True for development
        workers=1,              # increase with gunicorn in production
        log_level="info",
    )