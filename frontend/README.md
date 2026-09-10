# 医生服务系统 - 前端项目

## 📋 项目说明

这是医生服务系统的 **React 18 + TypeScript 前端项目**。

### 核心技术栈
- **框架**: React 18
- **语言**: TypeScript 5
- **状态管理**: Redux Toolkit
- **UI 库**: Ant Design 5
- **路由**: React Router v6
- **构建工具**: Vite
- **实时通信**: Socket.io

### 项目结构

```
src/
├── pages/                      # 页面组件
│   ├── Login/                  # 登录页面
│   ├── Dashboard/              # 工作台
│   └── ...                     # 其他页面
├── components/                 # 可复用组件
├── services/                   # API 服务层
├── store/                      # Redux 状态管理
│   └── slices/                 # Redux Slice
├── hooks/                      # 自定义 hooks
├── utils/                      # 工具函数
├── styles/                     # 全局样式
├── router/                     # 路由配置
├── App.tsx                     # 根组件
├── main.tsx                    # 应用入口
└── vite-env.d.ts              # Vite 类型定义
```

### 快速开始

#### 1. 安装依赖
```bash
npm install
```

#### 2. 启动开发服务器
```bash
npm run dev
```

浏览器会自动打开 http://localhost:3000

#### 3. 构建生产版本
```bash
npm run build
```

### 常用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查和修复
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run type-check
```

### API 集成

所有 API 请求通过 `/src/services/` 下的服务进行管理。

#### 认证 API
```typescript
import { authService } from '@/services/auth';

// 登录
const response = await authService.login({
  username: 'doctor@example.com',
  password: 'password123',
});

// 注册
await authService.register({...});

// 刷新 Token
await authService.refreshToken();

// 登出
await authService.logout();
```

### 状态管理

使用 Redux Toolkit 进行全局状态管理。

#### 认证状态
```typescript
const auth = useAppSelector((state) => state.auth);
// {
//   token: string | null,
//   isAuthenticated: boolean,
//   isLoading: boolean,
//   error: string | null
// }
```

#### 用户状态
```typescript
const user = useAppSelector((state) => state.user);
// {
//   id: string | null,
//   username: string | null,
//   email: string | null,
//   roles: string[],
//   isLoading: boolean,
//   error: string | null
// }
```

### 权限控制

使用 `ProtectedRoute` 组件进行路由级权限控制。

```typescript
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>
```

### 页面开发指南

#### 开发顺序 (按优先级)

**Week 1-2: 基础页面**
- [x] 登录页面 (完成)
- [x] 工作台布局 (完成)
- [ ] 患者管理页面
- [ ] 患者详情页面

**Week 2-3: 核心功能页面**
- [ ] 在线问诊页面
- [ ] 电子病历页面
- [ ] 病历详情页面

**Week 3-4: 扩展功能页面**
- [ ] 远程会诊页面
- [ ] 患者健康管理页面
- [ ] 医生社交页面

### 样式规范

所有组件使用 Ant Design 提供的组件和样式。

#### 全局色彩方案
```css
@primary-color: #1890ff;
@success-color: #52c41a;
@warning-color: #faad14;
@error-color: #f5222d;
@info-color: #1890ff;
```

#### 间距规范
- 小间距: 8px
- 默认间距: 16px
- 大间距: 24px

### HTTP 请求拦截

所有 HTTP 请求都会自动添加 Authorization header：

```
Authorization: Bearer {token}
```

如果响应是 401 (未授权)，会自动跳转到登录页面。

### 性能优化

- 使用 React.lazy 实现路由级代码分割
- 使用 Vite 进行快速开发和生产构建
- 使用 Redux 进行状态管理，避免不必要的重新渲染

### 测试

```bash
# 运行测试
npm test

# 查看覆盖率
npm test -- --coverage
```

### 部署

#### Docker 部署
```bash
docker build -t doctor-service-frontend .
docker run -p 80:3000 doctor-service-frontend
```

#### 环境变量

在 `.env` 文件中配置：
```env
VITE_APP_API_URL=http://localhost:3001/api/v1
```

### 常见问题

**Q: 如何修改 API 地址？**
A: 编辑 `src/services/api.ts` 中的 `API_BASE_URL`

**Q: 如何添加新的页面？**
A: 在 `src/pages/` 中创建新文件夹，然后在 `src/router/index.tsx` 中添加路由

**Q: 如何管理全局状态？**
A: 在 `src/store/slices/` 中创建新的 Slice，然后在 `src/store/index.ts` 中注册

### 相关文档

- 📖 [Ant Design 文档](https://ant.design/)
- 📖 [Redux Toolkit 文档](https://redux-toolkit.js.org/)
- 📖 [React Router 文档](https://reactrouter.com/)
- 📋 [项目规划](../../01_项目规划/)

### 支持

有问题？请查看项目规划文档或联系项目经理。

---

**Happy Coding! 🚀**
