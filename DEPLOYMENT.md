# 🚀 部署指南（从 GitHub 拉取后如何跑起来）

本指南面向拉取本仓库的人，目标是「拉下来就能跑」。整套系统由三部分组成：

| 组件 | 技术栈 | 默认地址 |
|------|--------|---------|
| 数据库 | PostgreSQL 16 | localhost:5432 |
| 后端 | NestJS 10 + TypeORM | http://localhost:3001 |
| 前端 | React 18 + Vite + Ant Design | http://localhost:3000 |

---

## 0. 前置要求

- **Node.js ≥ 18**（推荐 20+，代码使用了原生 `fetch`）
- **npm**（随 Node 一起安装）
- **Docker + Docker Compose**（推荐，用于跑数据库；如你已有 PostgreSQL 也可不用）

---

## 1. 启动数据库

数据库有两种方式，**二选一**：

### 方式 A：Docker（推荐，最省事、最一致）

在仓库根目录执行：

```bash
docker compose up -d
```

首次启动会自动创建一个 `doctor_service_dev` 数据库，并执行
`docker/initdb/001-uuid-ossp.sql` 安装 `uuid-ossp` 扩展（后端 UUID 主键依赖它）。

> 若本机 5432 端口已被占用，请先停掉本机的 PostgreSQL，或修改
> `docker-compose.yml` 的端口映射与 `backend/.env.development` 的 `DB_PORT`。

### 方式 B：使用已有的 PostgreSQL

若你本机已有 PostgreSQL（例如免安装版），执行初始化脚本（建库 + 装扩展，幂等）：

```bash
cd backend
npm install
npm run db:init
```

> 该脚本会读取 `backend/.env.development` 的 `DB_*` 配置，创建目标数据库并安装
> `uuid-ossp` 扩展。数据库连接信息不一致时，先改 `.env.development`。

---

## 2. 启动后端

```bash
cd backend
npm install
npm run build          # 编译 TypeScript
npm run start:prod     # 生产模式；开发热重载可用 npm run start:dev
```

后端首次启动时 TypeORM 会**自动建表**（开发/非 production 环境 `synchronize` 开启）。

看到以下输出即成功：

```
🚀 医生服务系统后端运行在: http://localhost:3001
📚 API 文档: http://localhost:3001/api/docs
```

---

## 3. 初始化账号与演示数据

保持后端运行，另开一个终端：

```bash
cd backend
npm run db:seed
```

该命令会：
1. `seed-admin.js` —— 创建管理员账号 **admin / admin123**（幂等）；
2. `seed-demo-data.js` —— 通过后端 API 灌入演示数据（患者 5、病历 4、问诊 4、会诊 3、健康 4、帖子 3），走真实业务逻辑并产生审计日志。

---

## 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

打开 **http://localhost:3000**，用 **admin / admin123** 登录。

---

## 5. 生产部署注意事项

- **更换密钥**：创建 `backend/.env.production`（可复制 `.env.example`），务必修改
  `JWT_SECRET` 和数据库口令，并将 `NODE_ENV=production`（此时 TypeORM 不再自动 `synchronize`，
  应改用迁移脚本维护表结构）。
- **前端构建**：`cd frontend && npm run build`，将 `dist/` 交给任意静态服务器（Nginx 等），
  并把 `VITE_APP_API_URL` 指到真实后端地址。
- **跨域**：后端 `CORS_ORIGIN` 需与前端线上地址一致。
- **数据库持久化**：Docker 方式下数据存在 `pgdata` 卷中；`docker compose down`（不带 `-v`）
  不会删除数据，`docker compose down -v` 会连同数据一起清空。

---

## 常见问题

- **建表报错 `function uuid_generate_v4() does not exist`**：未安装 `uuid-ossp` 扩展。
  用 Docker 方式会自动装；手动方式请运行 `npm run db:init`。
- **登录失败 / 端口拒绝**：确认后端在 3001 运行、数据库在 5432 运行，前端 `.env.development`
  的 `VITE_APP_API_URL` 指向 `http://localhost:3001/api/v1`。
- **中文乱码**：Windows 下用 `curl` 测接口可能乱码，请用浏览器或 Postman。
