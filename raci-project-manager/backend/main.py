from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from routes import raci


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.create_tables()
    yield


app = FastAPI(title="RACI Project Manager API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3004", "http://127.0.0.1:3004"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(raci.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
