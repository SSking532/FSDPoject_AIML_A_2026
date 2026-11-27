"""Smart Ambulance Tracking & Emergency Response — FastAPI application."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register tables)
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import admin, auth, dispatch, fleet, requests, ws
from .seed import seed


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    if settings.SEED_DEMO_DATA:
        with SessionLocal() as db:
            seed(db)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Smart Ambulance API",
    version="1.0.0",
    description="Emergency request intake, ambulance allocation, GPS tracking and trip management.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, requests.router, fleet.router, dispatch.router, admin.router, ws.router):
    app.include_router(r)


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "database": engine.dialect.name}
