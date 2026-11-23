import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .data import JOBS, USERS  # noqa: E402
from .db import init_db  # noqa: E402
from .routers import admin, admin_auth, api, auth, oauth  # noqa: E402

app = FastAPI(title="jobpick API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth)
app.include_router(oauth)
app.include_router(api)
app.include_router(admin_auth)
app.include_router(admin)

init_db(JOBS, USERS)


@app.get("/")
def root():
    return {"service": "jobpick-api", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health")
def health():
    return {"status": "ok", "env": os.getenv("APP_ENV", "local")}
