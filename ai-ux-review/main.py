from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from providers import get_provider_info
except ImportError:
    def get_provider_info(): return {"provider": "not_configured"}

from router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("AI UX Review API starting up...")
    yield
    # Shutdown
    print("AI UX Review API shutting down...")


app = FastAPI(
    title="AI UX Review API",
    description="Heuristic UX analysis powered by AI",
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
async def health():
    return {"status": "ok", "provider": get_provider_info()}
