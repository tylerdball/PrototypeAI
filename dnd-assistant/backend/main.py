import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import init_db
from routes.campaigns import router as campaigns_router
from routes.npcs import router as npcs_router
from routes.encounters import router as encounters_router
from routes.sessions import router as sessions_router
from routes.characters import router as characters_router
from routes.lore import router as lore_router
from routes.images import router as images_router

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="D&D Campaign Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3003"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(campaigns_router, prefix="/api")
app.include_router(npcs_router, prefix="/api")
app.include_router(encounters_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(characters_router, prefix="/api")
app.include_router(lore_router, prefix="/api")
app.include_router(images_router, prefix="/api")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
