# 项目初始化和启动指南

## 📦 项目结构

```
02_代码/
├── backend/          # NestJS 后端
├── frontend/         # React 18 前端
├── docs/            # 项目文档
└── config/          # 共享配置
```

## 🚀 快速启动

### 第一步: 安装依赖

#### 后端依赖安装
```bash
cd backend
npm install
```

#### 前端依赖安装
```bash
cd frontend
npm install
```

### 第二步: 环境配置

#### 后端环境配置 (.env)
```bash
cd backend
cp .env.example .env.development
```

编辑 `.env.development`：
```env
NODE_ENV=development
PORT=3001

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=doctor_service_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRATION=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

#### 前端环境配置 (.env)
```bash
cd frontend
cat > .env.development << EOF
VITE_APP_API_URL=http://localhost:3001/api/v1
EOF
```

### 第三步: 数据库初始化

#### 创建数据库
```bash
# 使用 PostgreSQL 客户端连接
psql -U postgres

# 创建数据库
CREATE DATABASE doctor_service_dev;

# 创建用户
CREATE USER doctor_user WITH PASSWORD 'your_password';
ALTER ROLE doctor_user WITH CREATEDB;

# 授权
GRANT ALL PRIVILEGES ON DATABASE doctor_service_dev TO doctor_user;
```

#### 创建数据库迁移（在后端目录）
```bash
cd backend
npm run migration:generate -- src/database/migrations/InitialSchema
npm run migration:run
```

#### 初始化角色和权限（可选）
```bash
npm run seed:roles
npm run seed:permissions
```

### 第四步: 启动应用

#### 启动后端
```bash
cd backend
npm run start:dev
```

预期输出：
```
[Nest] 12345   - 01/01/2026, 12:00:00 PM     LOG [NestFactory] Starting Nest application...
[Nest] 12345   - 01/01/2026, 12:00:00 PM     LOG [InstanceLoader] ConfigModule dependencies initialized
...
[Nest] 12345   - 01/01/2026, 12:00:00 PM     LOG [NestApplication] Nest application successfully started
✓ Server running at http://localhost:3001
✓ Swagger API docs available at http://localhost:3001/api/docs
```

#### 启动前端
```bash
cd frontend
npm run dev
```

预期输出：
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

### 第五步: 验证系统运行

#### 测试登录
1. 打开浏览器访问 http://localhost:3000
2. 应看到登录页面
3. 输入测试用户名和密码

#### 查看 API 文档
访问 http://localhost:3001/api/docs 查看 Swagger 文档

## 🛠️ 开发工具

### 代码编辑器推荐
- **VS Code** (推荐)
- **WebStorm**

### VS Code 推荐扩展
```bash
# NestJS
code --install-extension adrien-polynard.nestjs-snippets

# React
code --install-extension dsznajder.es7-react-js-snippets

# TypeScript
code --install-extension ms-vscode.vscode-typescript-next

# Prettier
code --install-extension esbenp.prettier-vscode

# ESLint
code --install-extension dbaeumer.vscode-eslint
```

### 调试后端

#### 使用 VS Code 调试
在 `.vscode/launch.json`：
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch NestJS",
      "program": "${workspaceFolder}/backend/src/main.ts",
      "restart": true,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 调试前端

在 Chrome DevTools 中调试，或使用 VS Code 的 React 调试扩展。

## 📊 项目统计

- **后端代码文件**: 15+ TypeScript 文件
- **前端代码文件**: 12+ TypeScript/React 文件
- **数据库表**: 40+ 表定义
- **API 端点**: 50+ 规划中
- **状态管理**: Redux 2 个主要 Slice

## 🔗 相关服务

| 服务 | 地址 | 说明 |
|-----|------|------|
| 后端 API | http://localhost:3001 | NestJS 服务 |
| 前端应用 | http://localhost:3000 | React 应用 |
| API 文档 | http://localhost:3001/api/docs | Swagger 文档 |
| 数据库 | localhost:5432 | PostgreSQL |
| 缓存 | localhost:6379 | Redis |

## ❓ 常见问题

### Q: 如何修改默认端口？
A: 编辑 `.env.development` 中的 `PORT` 变量

### Q: 如何清空数据库？
A:
```bash
# PostgreSQL
psql -U postgres
DROP DATABASE doctor_service_dev;
CREATE DATABASE doctor_service_dev;
```

### Q: 如何查看数据库变更？
A: 使用 pgAdmin 或 DataGrip 连接数据库

### Q: 前端报 CORS 错误？
A: 检查后端 `.env` 中的 `CORS_ORIGIN` 是否与前端地址一致

## 📝 下一步

1. ✅ 环境搭建完成
2. ⏳ 开发认证模块完整功能
3. ⏳ 开发患者管理模块
4. ⏳ 开发在线问诊模块
5. ⏳ 开发其他业务模块

## 💡 提示

- 后端修改会自动热重载 (`npm run start:dev`)
- 前端修改会实时刷新 (Vite HMR)
- 使用 Git 进行版本控制
- 在提交代码前运行 lint 检查

---

**需要帮助？** 查看项目规划文档或联系项目经理。
