# 都梁痛安 · 疼痛管理智能辅助平台

`HealthCareAgent v2` 是一个面向医护人员的医疗辅助系统，当前仓库实现聚焦于疼痛管理、阿片类药物临床辅助、虚拟病例训练、患者档案管理和政策问答。

当前前端品牌文案使用“都梁痛安”，仓库目录仍保留 `HealthCareAgent` 命名。

## 项目概览

本项目采用前后端分离架构：

- 前端基于 `Next.js 14 + React 18 + TypeScript + Tailwind CSS`
- 后端基于 `FastAPI + Pydantic + PostgreSQL`
- 鉴权采用 `JWT + bcrypt`
- AI 能力通过 `OpenAI 兼容 SDK` 对接 `MiniMax / 通义千问 / 百川`
- 临床模块内置 `ORT` 风险分层和 `MME/day` 剂量预警

当前实现更接近“可运行的业务原型 / 演示系统”，而不是纯概念稿。

## 已实现模块

### 1. 登录与用户体系

- 用户注册、登录、JWT 鉴权
- 受保护页面路由守卫
- 用户心理画像刷新与展示

### 2. 临床辅助决策

- 结构化病例录入
- ORT 风险等级判断
- MME/day 剂量预警
- 多模型联合会诊输出
- MDT 讨论消息持久化
- 病例与 AI 结果保存到 PostgreSQL

### 3. 虚拟病例训练

- AI 生成训练病例
- 多轮问诊对话
- 训练结果评估
- 训练记录、评分与消息留存

### 4. 患者管理与工作台

- 患者档案增删改查
- 风险等级筛选
- 患者基础指标展示
- 简单统计看板接口

### 5. 政策问答

- 基于 LLM 的政策类问答页面
- Markdown 格式结果展示

## 技术栈

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端应用层 | Next.js 14, React 18, TypeScript | 页面、路由、组件化交互 |
| UI 样式层 | Tailwind CSS 3, `@tailwindcss/forms`, `@tailwindcss/typography` | 响应式样式、表单和 Markdown 排版 |
| 前端代理层 | Next App Router Route Handlers, Middleware, Rewrite | 登录态校验、部分接口代理、前后端解耦 |
| 后端服务层 | FastAPI, Uvicorn, Pydantic | REST API、请求校验、异步服务 |
| 鉴权安全 | `python-jose`, `bcrypt` | JWT 签发校验、密码哈希 |
| AI 接入层 | OpenAI SDK | 以 OpenAI 兼容方式接入 MiniMax / Qwen / Baichuan |
| 数据持久层 | PostgreSQL, `psycopg` | 患者、病例、训练、消息、用户数据存储 |

## 系统架构

```text
医生 / 学员 / 管理员
        ↓
前端页面层
(Next.js + React + Tailwind)
        ↓
前端代理与鉴权层
(Next Middleware + Route Handlers / Rewrite)
        ↓
后端 API 层
(FastAPI + JWT + Pydantic)
        ↓
业务逻辑层
(clinical / training / auth / analytics / policy)
        ↓
AI 与规则层
(MiniMax / Qwen / Baichuan + ORT / MME)
        ↓
数据层
(PostgreSQL)
```

## 目录结构

```text
healthcareagent-v2/
├─ backend/
│  ├─ api/routes/              # 认证、临床、训练、政策、患者、统计接口
│  ├─ core/                    # 配置、鉴权
│  ├─ repositories/            # 数据访问层
│  ├─ services/                # LLM 服务、心理画像服务
│  ├─ db.py                    # 数据库初始化与建表
│  └─ main.py                  # FastAPI 启动入口
├─ frontend/
│  ├─ src/app/                 # Next.js App Router 页面与部分 API 代理
│  ├─ src/components/          # 前端组件
│  ├─ src/lib/                 # Axios 封装、后端代理逻辑
│  ├─ public/                  # 静态资源
│  └─ tailwind.config.js       # Tailwind 配置
└─ README.md
```

## 主要页面

- `/login`：登录页
- `/clinical`：临床辅助决策页
- `/training`：虚拟训练入口
- `/doctor`：患者工作台
- `/policy`：政策问答
- `/profile`：用户画像

## 主要后端接口

- `/api/auth/*`：注册、登录、当前用户、画像
- `/api/patients/*`：患者档案管理
- `/api/clinical/*`：病例保存、AI 分析、讨论消息、任务轮询
- `/api/training/*`：训练生成、对话、评估、统计
- `/api/analytics/*`：基础统计接口
- `/api/policy/chat`：政策问答

## 数据库说明

系统启动时会自动尝试：

- 创建目标数据库
- 初始化表结构
- 写入演示患者数据
- 写入演示账号

当前数据库中主要表包括：

- `users`
- `patients`
- `clinical_cases`
- `mdt_messages`
- `training_sessions`
- `training_messages`

## 本地启动

### 1. 启动后端

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

默认数据库连接见 `backend/.env.example`：

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/healthcareagent
# POSTGRES_ADMIN_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/postgres
```

### 2. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:3000`，后端默认运行在 `http://localhost:8000`。

## 可选 AI 配置

如果不配置模型密钥，系统中的 AI 功能会降级或返回空结果，但基础页面和数据库能力仍可运行。

可选环境变量包括：

```env
OC_GATEWAY_TOKEN=
OC_GATEWAY_URL=http://127.0.0.1:18789/v1
DASHSCOPE_API_KEY=
BAICHUAN_API_KEY=
```

当前 LLM 路径大致如下：

- 优先走 `OC Gateway`，默认模型标识为 `minimax`
- 若未配置则尝试 `DashScope / qwen-plus`
- 部分会诊和训练评估场景可补充使用 `Baichuan4-Turbo`

## 默认演示账号

本地首次启动后端后，会自动写入一个演示账号：

- 用户名：`doctor001`
- 密码：`password123`

仅建议用于本地开发和演示环境。

## 当前 README 特别说明

这份 README 以当前仓库代码为准，已经去掉了以下不再适合作为主描述的内容：

- `Streamlit` 作为主实现界面
- 与当前目录结构不一致的服务层命名
- 无法从现有代码直接验证的超大规模知识库数字
- 过于偏项目书、但和实际工程入口脱节的描述

如果后续要把这份文档再改成“创新创业大赛项目书版”，建议在此基础上另做一份面向评委的说明文档，而不是继续把工程 README 和比赛材料混写在一起。
