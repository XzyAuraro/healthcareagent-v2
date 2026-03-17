from dotenv import load_dotenv
load_dotenv()  # 加载 .env 中的 API 密钥

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import patients, auth, clinical, analytics, training, policy

app = FastAPI(
    title="Healthcare Agent API",
    description="医疗辅助决策系统后端 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(patients.router, prefix="/api/patients", tags=["患者管理"])
app.include_router(clinical.router, prefix="/api/clinical", tags=["临床辅助"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["数据分析"])
app.include_router(training.router, prefix="/api/training", tags=["虚拟训练"])
app.include_router(policy.router, prefix="/api/policy", tags=["政策解读"])

@app.get("/")
async def root():
    return {
        "message": "Healthcare Agent API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
