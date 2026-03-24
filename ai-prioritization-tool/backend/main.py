from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.prioritize import router as prioritize_router

app = FastAPI(title="AI Prioritization Tool")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prioritize_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
