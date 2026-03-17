from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import analytics, auth, clinical, patients, policy, training
from db import database_ready, initialize_database

app = FastAPI(
    title="Healthcare Agent API",
    description="Healthcare decision support backend API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["patients"])
app.include_router(clinical.router, prefix="/api/clinical", tags=["clinical"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(training.router, prefix="/api/training", tags=["training"])
app.include_router(policy.router, prefix="/api/policy", tags=["policy"])


@app.on_event("startup")
async def startup_event():
    initialize_database()


@app.get("/")
async def root():
    return {
        "message": "Healthcare Agent API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "ready" if database_ready() else "not_ready",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
