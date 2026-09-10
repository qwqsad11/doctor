# 📚 医生服务系统 - 项目文件导览

## 🏠 项目入口

启动前 **必读**:
- [QUICK_START.md](./QUICK_START.md) - ⚡ 5分钟快速启动指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 🚀 部署指南（拉取后如何跑起来）
- [SETUP.md](./SETUP.md) - 🔧 详细环境配置指南
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - 📊 项目进度和状态

---

## 📂 项目结构导览

```
企业团队工程/
│
├── 01_项目规划/                    📋 项目规划文档
│   ├── 项目总体规划.md              (80KB) 14周开发计划
│   ├── 核心模块架构设计.md          (23KB) 8个模块详细设计
│   ├── 待补充需求和行动计划.md      (21KB) 需求补充清单
│   ├── 项目启动清单.md              (16KB) 启动前检查清单
│   ├── 📂_文件结构说明.md           文档导航指南
│   └── ✨_规划完成总结.md           规划阶段完成总结
│
├── 02_代码/                        💻 项目代码和配置
│   ├── backend/                    🔧 NestJS 后端
│   │   ├── src/
│   │   │   ├── main.ts             应用入口
│   │   │   ├── app.module.ts       主模块
│   │   │   ├── config/
│   │   │   │   ├── database.config.ts     PostgreSQL 配置
│   │   │   │   ├── jwt.config.ts         JWT 配置
│   │   │   │   └── typeorm.config.ts     TypeORM 配置
│   │   │   └── modules/            业务模块
│   │   │       ├── auth/           认证模块
│   │   │       ├── users/          用户模块
│   │   │       ├── patients/       患者模块 (待开发)
│   │   │       ├── consultations/  在线问诊 (待开发)
│   │   │       ├── emr/            电子病历 (待开发)
│   │   │       ├── conferences/    远程会诊 (待开发)
│   │   │       ├── health/         健康管理 (待开发)
│   │   │       ├── social/         医生社交 (待开发)
│   │   │       └── audit/          操作审计 (待开发)
│   │   ├── package.json            项目依赖 (NestJS 10, TypeORM, JWT等)
│   │   ├── tsconfig.json           TypeScript 配置
│   │   ├── .env.example            环境变量模板
│   │   ├── .env.development        开发环境配置 (需填写)
│   │   └── README.md               后端开发指南 (160行)
│   │
│   ├── frontend/                   ⚛️ React 18 前端
│   │   ├── src/
│   │   │   ├── main.tsx            React 入口
│   │   │   ├── App.tsx             根组件
│   │   │   ├── pages/              页面组件
│   │   │   │   ├── Login/          登录页 (完成)
│   │   │   │   └── Dashboard/      工作台 (完成)
│   │   │   ├── components/         可复用组件 (待开发)
│   │   │   ├── services/           API 服务层
│   │   │   │   ├── api.ts          Axios 实例 + 拦截器
│   │   │   │   └── auth.ts         认证服务
│   │   │   ├── store/              Redux 状态管理
│   │   │   │   └── slices/
│   │   │   │       ├── authSlice.ts      认证状态
│   │   │   │       └── userSlice.ts      用户状态
│   │   │   ├── hooks/              自定义 hooks
│   │   │   ├── router/             路由配置
│   │   │   └── styles/             全局样式
│   │   ├── index.html              HTML 入口模板
│   │   ├── package.json            项目依赖 (React 18, Redux, Vite等)
│   │   ├── vite.config.ts          Vite 构建配置
│   │   ├── tsconfig.json           TypeScript 配置
│   │   ├── .env.development        开发环境配置 (已配置)
│   │   └── README.md               前端开发指南 (190行)
│   │
│   ├── docs/                       📖 文档目录 (建设中)
│   ├── config/                     ⚙️ 共享配置 (建设中)
│   ├── QUICK_START.md              ⚡ 快速启动参考 (本文件)
│   ├── SETUP.md                    🔧 详细启动指南 (165行)
│   ├── PROJECT_STATUS.md           📊 项目状态报告 (200行)
│   └── .vscode-config-template.js  🎨 VS Code 配置模板
│
└── README.md                       📄 项目主文档
```

---

## 🚀 快速导航

### 🎯 我想...

#### 启动应用
→ 查看 [QUICK_START.md](./QUICK_START.md)

#### 配置开发环境
→ 查看 [SETUP.md](./SETUP.md)

#### 了解项目进度
→ 查看 [PROJECT_STATUS.md](./PROJECT_STATUS.md)

#### 开发后端功能
→ 查看 [backend/README.md](./backend/README.md)

#### 开发前端功能
→ 查看 [frontend/README.md](./frontend/README.md)

#### 了解项目规划
→ 查看 [01_项目规划/项目总体规划.md](../01_项目规划/项目总体规划.md)

#### 查看数据库设计
→ 查看 [01_项目规划/核心模块架构设计.md](../01_项目规划/核心模块架构设计.md)

#### 查看需求清单
→ 查看 [01_项目规划/待补充需求和行动计划.md](../01_项目规划/待补充需求和行动计划.md)

---

## 📖 文档速查表

### 启动和配置 (必读)

| 文档 | 内容 | 阅读时间 |
|------|------|---------|
| [QUICK_START.md](./QUICK_START.md) | 5分钟快速启动 | 5 分钟 |
| [SETUP.md](./SETUP.md) | 详细环境配置 | 15 分钟 |
| [backend/README.md](./backend/README.md) | 后端开发指南 | 10 分钟 |
| [frontend/README.md](./frontend/README.md) | 前端开发指南 | 10 分钟 |

### 项目管理

| 文档 | 内容 | 用途 |
|------|------|------|
| [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 项目状态报告 | 查看进度 |
| [01_项目规划/项目总体规划.md](../01_项目规划/项目总体规划.md) | 14周开发计划 | 了解全局 |
| [01_项目规划/核心模块架构设计.md](../01_项目规划/核心模块架构设计.md) | 架构和数据设计 | 技术参考 |
| [01_项目规划/待补充需求和行动计划.md](../01_项目规划/待补充需求和行动计划.md) | 需求清单 | 补充需求 |

---

## 💡 关键信息一览

### 技术栈
- **后端**: Node.js 18 + NestJS 10 + TypeScript 5 + PostgreSQL 12 + Redis 6
- **前端**: React 18 + TypeScript 5 + Redux Toolkit + Ant Design 5 + Vite
- **工具**: Docker, Git, VS Code

### 项目进度
- 📊 **总体完成度**: 40%
- 📋 **项目规划**: 90% ✅
- 🔧 **基础架构**: 85% ✅
- 🔐 **认证模块**: 40% 🔄
- 👥 **用户管理**: 30% 🔄
- 📱 **其他模块**: 0% ⏳

### 关键时间节点
- **Week 1-2**: 项目启动 + 认证模块
- **Week 3-8**: P0 功能开发 (患者/问诊/病历/会诊)
- **Week 9-11**: P1 功能 (健康/社交/审计)
- **Week 12-13**: 测试 + 优化
- **Week 14**: 上线发布

### 开发服务地址
| 服务 | 地址 | 备注 |
|------|------|------|
| 前端应用 | http://localhost:3000 | React 应用 |
| 后端 API | http://localhost:3001 | NestJS API |
| API 文档 | http://localhost:3001/api/docs | Swagger |
| 数据库 | localhost:5432 | PostgreSQL |
| 缓存 | localhost:6379 | Redis |

---

## 🔧 常用命令速记

```bash
# 项目目录
cd 02_代码

# 后端开发
cd backend
npm install              # 安装依赖
npm run start:dev       # 启动开发服务器
npm run build           # 构建生产版本
npm run test            # 运行测试
npm run lint            # 代码检查

# 前端开发
cd frontend
npm install              # 安装依赖
npm run dev             # 启动开发服务器
npm run build           # 构建生产版本
npm test                # 运行测试
npm run lint            # 代码检查
```

---

## 👥 团队协作指南

### 代码审查流程
1. 创建功能分支
2. 提交 Pull Request
3. 代码审查
4. 合并到 main 分支

### 分支命名
- `feature/` - 新功能
- `fix/` - 修复 bug
- `refactor/` - 代码重构
- `docs/` - 文档更新

### 提交规范
```
feat: 添加新功能
fix: 修复问题
refactor: 代码重构
docs: 文档更新
test: 测试相关
chore: 其他
```

---

## 🎓 快速学习

### 我是后端开发者
1. 阅读 [backend/README.md](./backend/README.md) (10分钟)
2. 了解 [NestJS 基础](https://docs.nestjs.com/) (1小时)
3. 查看认证模块实现 (30分钟)
4. 开始开发新功能!

### 我是前端开发者
1. 阅读 [frontend/README.md](./frontend/README.md) (10分钟)
2. 了解 [React Hooks](https://react.dev/reference/react/hooks) (1小时)
3. 了解 [Redux Toolkit](https://redux-toolkit.js.org/) (30分钟)
4. 查看登录页面实现 (30分钟)
5. 开始开发新功能!

### 我是全栈开发者
按照上面的两个流程，分别学习后端和前端。

---

## 🚨 常见问题

**Q: 第一次启动需要做什么?**
A: 按照 [QUICK_START.md](./QUICK_START.md) 的步骤操作

**Q: 如何查看 API 文档?**
A: 后端运行后访问 http://localhost:3001/api/docs

**Q: 如何提交代码?**
A: 创建分支 → 提交 PR → 代码审查 → 合并

**Q: 如何处理数据库问题?**
A: 查看 [SETUP.md](./SETUP.md) 中的数据库部分

**Q: 忘记 API 格式怎么办?**
A: 查看 Swagger 文档或 [backend/README.md](./backend/README.md)

---

## 📞 获取帮助

1. **查看文档** - 查看本导航和相关文档
2. **搜索 Issue** - 检查是否有类似问题已解决
3. **联系团队** - 咨询项目经理或技术负责人

---

## 📋 检查清单

首次开发前检查:

- [ ] 阅读了 [QUICK_START.md](./QUICK_START.md)
- [ ] 安装了 Node.js 18+ 和 PostgreSQL 12+
- [ ] 克隆了项目仓库
- [ ] 安装了依赖 (`npm install`)
- [ ] 配置了环境变量 (`.env.development`)
- [ ] 启动了后端和前端
- [ ] 能访问 http://localhost:3000 (前端)
- [ ] 能访问 http://localhost:3001/api/docs (API 文档)

---

## 🎉 现在就开始!

**推荐流程:**
1. ⭐ 阅读 [QUICK_START.md](./QUICK_START.md)
2. ⭐ 按步骤启动应用
3. ⭐ 查看后端/前端对应的 README
4. ⭐ 开始开发!

---

**💡 提示**: 收藏此页面，方便快速查阅!

**项目状态**: 🟡 开发中  
**最后更新**: 2026年1月  
**下次更新**: Week 1 末
