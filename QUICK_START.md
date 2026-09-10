# 🚀 开发人员快速参考

## 📋 首次启动（完整步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)）

### 1️⃣ 起数据库（二选一）
```bash
# 方式 A：Docker（推荐，自动建库 + 装 uuid-ossp 扩展）
docker compose up -d

# 方式 B：已有 PostgreSQL（建库 + 装扩展）
cd backend && npm install && npm run db:init
```

### 2️⃣ 启动后端（首次启动自动建表）
```bash
cd backend
npm install
npm run start:dev     # 或 npm run build && npm run start:prod
```

### 3️⃣ 初始化账号 + 演示数据（保持后端运行，另开终端）
```bash
cd backend
npm run db:seed       # 创建 admin/admin123 + 演示数据
```

### 4️⃣ 启动前端
```bash
cd frontend
npm install
npm run dev
```

### 5️⃣ 打开浏览器
- **前端**: http://localhost:3000（登录 admin / admin123）
- **后端 API 文档**: http://localhost:3001/api/docs

---

## 🛠️ 常用命令速查表

### 后端命令

```bash
cd backend

# 开发模式 (支持热重载)
npm run start:dev

# 构建
npm run build

# 生产模式
npm run start:prod

# 运行测试
npm run test

# 测试覆盖率
npm run test:cov

# Lint 检查
npm run lint

# 格式化代码
npm run format

# 数据库迁移
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert

# 初始化数据库（建库 + 装 uuid-ossp 扩展，非 Docker 场景）
npm run db:init

# 初始化账号 + 演示数据
npm run db:seed
```

### 前端命令

```bash
cd frontend

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览构建
npm run preview

# Lint 检查
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run type-check

# 运行测试
npm test

# 测试覆盖率
npm test -- --coverage
```

---

## 📁 文件导航

### 需要修改文件时

| 功能 | 文件位置 |
|------|---------|
| 添加新的 API 端点 | `backend/src/modules/[module]/[module].controller.ts` |
| 添加业务逻辑 | `backend/src/modules/[module]/[module].service.ts` |
| 添加数据实体 | `backend/src/modules/[module]/entities/` |
| 修改数据库 | 创建迁移: `backend/src/database/migrations/` |
| 添加前端页面 | `frontend/src/pages/[PageName]/` |
| 添加组件 | `frontend/src/components/` |
| 调用 API | `frontend/src/services/` |
| 管理状态 | `frontend/src/store/slices/` |
| 修改路由 | `frontend/src/router/index.tsx` |
| 修改样式 | `frontend/src/styles/` |

---

## 🔗 API 调用示例

### 后端 - 创建新的 API 端点

```typescript
// 1. 创建 DTO (Data Transfer Object)
// backend/src/modules/users/dto/create-user.dto.ts
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

// 2. 在 Controller 中添加端点
// backend/src/modules/users/users.controller.ts
@Post()
@UseGuards(JwtAuthGuard)
async createUser(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}

// 3. 在 Service 中实现业务逻辑
// backend/src/modules/users/users.service.ts
async create(createUserDto: CreateUserDto) {
  const user = this.usersRepository.create(createUserDto);
  return this.usersRepository.save(user);
}
```

### 前端 - 调用 API

```typescript
// 方式 1: 直接使用 API
import api from '@/services/api';

const response = await api.get('/users');

// 方式 2: 使用服务层
import { authService } from '@/services/auth';

const result = await authService.login({
  username: 'doctor@example.com',
  password: 'password123'
});

// 方式 3: 在 Redux action 中
import { loginStart, loginSuccess, loginFailure } from '@/store/slices/authSlice';

dispatch(loginStart());
try {
  const response = await authService.login(credentials);
  dispatch(loginSuccess(response.access_token));
} catch (error) {
  dispatch(loginFailure(error.message));
}
```

---

## 🐛 常见问题快速解决

### Q: 后端启动报错 "找不到模块"
**A:** 运行 `npm install` 重新安装依赖

### Q: 前端白屏
**A:** 
1. 打开浏览器控制台检查错误
2. 检查 `.env.development` 中的 API 地址
3. 确认后端正常运行

### Q: 数据库连接失败
**A:**
1. 检查 PostgreSQL 是否运行
2. 验证 `.env.development` 中的数据库配置
3. 确认数据库已创建

### Q: 登录失败
**A:**
1. 检查后端 API 返回的错误信息
2. 验证用户是否存在
3. 查看服务器日志

### Q: API 返回 CORS 错误
**A:**
1. 检查后端 `CORS_ORIGIN` 配置
2. 确保与前端 URL 一致
3. 重启后端服务

---

## 🔐 环境变量速查

### 后端 (`.env.development`)
```env
NODE_ENV=development        # 环境标识
PORT=3001                   # 后端端口
DB_HOST=localhost           # 数据库主机
DB_PORT=5432                # 数据库端口
DB_USERNAME=postgres        # 数据库用户
DB_PASSWORD=postgres        # 数据库密码
DB_NAME=doctor_service_dev  # 数据库名
JWT_SECRET=your_secret      # JWT 密钥
JWT_EXPIRES_IN=7d           # Token 过期时间
CORS_ORIGIN=http://localhost:3000  # CORS 源
```

### 前端 (`.env.development`)
```env
VITE_APP_API_URL=http://localhost:3001/api/v1  # API 地址
```

---

## 📊 代码审查检查表

提交 PR 前检查:

- [ ] 代码能正常运行 (`npm run start:dev`)
- [ ] 运行 lint 检查无错误 (`npm run lint`)
- [ ] 代码已格式化 (`npm run format`)
- [ ] 添加了必要的注释
- [ ] TypeScript 没有错误
- [ ] 新增的 API 在 Swagger 中有文档
- [ ] 数据库变更有迁移脚本
- [ ] 单元测试通过 (`npm test`)

---

## 📚 学习资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [React 官方文档](https://react.dev/)
- [Redux Toolkit 官方文档](https://redux-toolkit.js.org/)
- [Ant Design 文档](https://ant.design/)
- [TypeORM 文档](https://typeorm.io/)

---

## 👥 工作流规范

### 提交代码流程
1. 创建功能分支: `git checkout -b feature/my-feature`
2. 提交代码: `git commit -m "feat: 添加新功能"`
3. 创建 Pull Request
4. 代码审查通过后合并

### 分支命名规范
- `feature/` - 新功能
- `fix/` - 修复 bug
- `refactor/` - 代码重构
- `docs/` - 文档更新
- `test/` - 测试相关

### 提交信息规范
```
feat: 添加新功能
fix: 修复 bug
refactor: 代码重构
docs: 文档更新
test: 添加测试
chore: 其他改动
```

---

## ⚡ 性能优化建议

- 使用 React.lazy 进行代码分割
- 使用 Redux DevTools 调试状态管理
- 监控 API 响应时间
- 定期运行性能分析

---

## 🚨 紧急联系

遇到问题?
1. 查看项目文档
2. 搜索 Issue
3. 联系项目经理

---

**💡 提示**: 收藏此页面，随时查看!
