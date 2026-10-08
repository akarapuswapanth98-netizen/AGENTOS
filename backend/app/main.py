"""FastAPI app entrypoint: CORS, routers, table creation, health check."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import CORS_ORIGINS
from app.database import Base, engine
from app.routers import auth, dashboard, goals, interviews, progress, report, resume, reviews, tasks
from app.schemas import HealthResponse
from app.utils.rate_limit import QuotaExceeded

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN201, ANN001
    """Create tables on startup."""
    logger.info("Creating tables (if needed)")
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AGENTOS API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(report.router)
app.include_router(resume.router)
app.include_router(reviews.router)
app.include_router(goals.router)
app.include_router(tasks.router)
app.include_router(progress.router)
app.include_router(interviews.router)


@app.exception_handler(QuotaExceeded)
def quota_handler(_request: Request, exc: QuotaExceeded) -> JSONResponse:
    """Turn quota exhaustion into a 429 with minutes until reset."""
    return JSONResponse(status_code=429, content={"detail": str(exc)})


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Liveness probe (public, no auth)."""
    return HealthResponse(status="ok")
