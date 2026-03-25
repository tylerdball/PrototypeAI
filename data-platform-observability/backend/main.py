from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes.datasets import router as datasets_router
from routes.pipelines import router as pipelines_router
from routes.query import router as query_router

app = FastAPI(title="Data Platform Observability")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3004"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets_router, prefix="/api")
app.include_router(pipelines_router, prefix="/api")
app.include_router(query_router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
