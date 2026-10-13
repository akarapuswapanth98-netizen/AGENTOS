"""FastAPI app entrypoint: CORS, routers, table creation, health check, structured logging."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import CORS_ORIGINS, validate_production_config
from app.database import Base, engine, get_db
from app.routers import (
    auth,
    dashboard,
    goals,
    interviews,
    me,
    progress,
    quizzes,
    report,
    reports,
    resume,
    reviews,
    stream,
    tasks,
)
from app.schemas import HealthResponse
from app.utils.rate_limit import QuotaExceeded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN201, ANN001
    """Validate production config, then create tables on startup."""
    validate_production_config()
    logger.info("Initializing Agent OS tables (if needed)")
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AGENTOS API",
    description="3D AI Career Operating System Backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    """Log structured execution telemetry and inject latency header."""
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Process-Time"] = f"{duration_ms}ms"
    logger.info(
        'method=%s path="%s" status=%s duration_ms=%s',
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# Register Application Routers
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(dashboard.router)
app.include_router(report.router)
app.include_router(reports.router)
app.include_router(resume.router)
app.include_router(reviews.router)
app.include_router(quizzes.router)
app.include_router(goals.router)
app.include_router(tasks.router)
app.include_router(progress.router)
app.include_router(interviews.router)
app.include_router(stream.router)


@app.exception_handler(QuotaExceeded)
def quota_handler(_request: Request, exc: QuotaExceeded) -> JSONResponse:
    """Turn quota exhaustion into a 429 with minutes until reset."""
    return JSONResponse(status_code=429, content={"detail": str(exc)})


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health(db: Session = Depends(get_db)):
    """Liveness probe (public, no auth). 503 + degraded when the DB is down."""
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(status="ok")
    except Exception:  # noqa: BLE001 - details must never leak into the body
        logger.warning("Health check: database unreachable")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "degraded"},
        )
