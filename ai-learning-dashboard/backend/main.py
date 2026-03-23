"""AI Learning Dashboard — FastAPI backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import drift, llm, rag

app = FastAPI(
    title="AI Learning Dashboard API",
    description="Backend for interactive AI/ML concept demos.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(llm.router)
app.include_router(rag.router)
app.include_router(drift.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
