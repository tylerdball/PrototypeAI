from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from router import router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    print("Synthetic Data Generator starting up...")
    yield
    # Shutdown
    print("Synthetic Data Generator shutting down...")


app = FastAPI(
    title="Synthetic Data Generator",
    description="Generate realistic synthetic datasets from schema definitions.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
