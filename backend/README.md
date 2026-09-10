# 医生服务系统 - 后端项目

## 📋 项目说明

这是医生服务系统的 **NestJS 后端项目**。

### 核心技术栈
- **框架**: NestJS 10
- **语言**: TypeScript 5
- **数据库**: PostgreSQL 12+
- **缓存**: Redis
- **认证**: JWT + Passport
- **API文档**: Swagger/OpenAPI

### 项目结构

```
src/
├── modules/                    # 核心业务模块 (8个)
│   ├── auth/                   # 认证与授权
│   ├── users/                  # 用户管理
│   ├── patients/               # 患者管理
│   ├── consultations/          # 在线问诊
│   ├── emr/                    # 电子病历
│   ├── conferences/            # 远程会诊
│   ├── health/                 # 患者健康管理
│   ├── social/                 # 医生社交
│   └── audit/                  # 操作审计
├── common/                     # 公共工具和装饰器
├── config/                     # 配置文件
├── database/                   # 数据库迁移和初始化
└── main.ts                     # 应用入口
```

### 快速开始

#### 1. 安装依赖
```bash
npm install
```

#### 2. 配置环境变量
复制 `.env.example` 到 `.env.development`
```bash
cp .env.example .env.development
```

编辑 `.env.development` 配置数据库和其他服务：
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=doctor_service_dev
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d
```

#### 3. 启动开发服务器
```bash
npm run start:dev
```

服务器会在 http://localhost:3001 启动
API 文档在 http://localhost:3001/api/docs

### 常用命令

```bash
# 开发模式 (热重载)
npm run start:dev

# 生产模式
npm run build
npm run start:prod

# 运行测试
npm test
npm run test:cov

# 代码格式化
npm run format

# 代码检查和修复
npm run lint

# 数据库迁移
npm run db:migrate
npm run db:rollback
```

### API 接口设计

所有 API 遵循以下规范：

#### 路由命名
- 模块路由: `/api/v1/{module}`
- 例如: `/api/v1/auth/login`

#### 响应格式
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

#### 错误处理
```json
{
  "code": 400,
  "message": "Bad Request",
  "errors": []
}
```

### 认证和授权

#### 多因素认证 (MFA)
- ✅ 密码认证
- ✅ 短信验证码 (TODO)
- ✅ 邮箱验证 (TODO)
- ✅ 人脸识别 (TODO)

#### 权限模型
采用 RBAC (Role-Based Access Control)
- 用户拥有多个角色
- 角色拥有多个权限
- 权限作用在资源上

示例：
```
医生角色 (Doctor)
  ├── view patient
  ├── create consultation
  ├── edit medical_record
  └── view health_data
```

#### 临时权限
用于特殊场景 (如会诊)：
```
会诊开始 → 授予临时权限
→ 医生可访问患者数据
→ 会诊结束 → 自动撤销权限
```

### 模块开发指南

#### 开发顺序 (按优先级)

**Week 3-4: 认证与权限模块**
- [x] User 实体
- [x] Role 实体
- [x] Permission 实体
- [ ] 登录接口
- [ ] 注册接口
- [ ] 权限检查中间件

**Week 4-5: 患者管理模块**
- [ ] Patient 实体
- [ ] PatientRecord 实体
- [ ] 患者搜索接口
- [ ] 患者档案查看接口

**Week 5-6: 在线问诊模块**
- [ ] Consultation 实体
- [ ] 图文问诊接口
- [ ] 视频通话集成

**Week 6-8: EMR 模块**
- [ ] MedicalRecord 实体
- [ ] MedicalOrder 实体
- [ ] 病历审核流程

### 数据库设计

所有实体都已在 `/src/modules/*/entities/` 文件夹中定义。

主要实体：
- `User` - 用户
- `Role` - 角色
- `Permission` - 权限
- `TempPermission` - 临时权限
- `Patient` - 患者 (TODO)
- `Consultation` - 问诊 (TODO)
- `MedicalRecord` - 病历 (TODO)

### 测试

#### 单元测试
```bash
npm test

# 查看覆盖率
npm run test:cov
```

#### 集成测试
```bash
npm run test:e2e
```

### 部署

#### Docker 部署
```bash
docker build -t doctor-service-backend .
docker run -p 3001:3001 doctor-service-backend
```

#### K8s 部署 (可选)
详见 `/docker` 和 `/k8s` 文件夹

### 监控和日志

- 所有错误都会记录到日志系统
- 监控指标通过 Prometheus 暴露
- 性能指标通过 APM 收集

### 常见问题

**Q: 如何修改数据库连接？**
A: 编辑 `.env.development` 文件中的 `DB_*` 变量

**Q: 如何添加新的认证方式？**
A: 在 `src/modules/auth/strategies/` 中添加新的 Strategy

**Q: 如何定义新的权限？**
A: 在数据库中插入 Permission 记录，然后在 Role 中关联

### 贡献指南

1. 创建特性分支: `git checkout -b feature/xxx`
2. 提交更改: `git commit -m "feat: xxx"`
3. 推送到远程: `git push origin feature/xxx`
4. 创建 Pull Request

### 相关文档

- 📖 [API 文档](http://localhost:3001/api/docs) - 开发时访问
- 📋 [项目规划](../../01_项目规划/)
- 📦 [架构设计](../../01_项目规划/核心模块架构设计.md)

### 支持

有问题？请查看项目规划文档或联系项目经理。

---

**Happy Coding! 🚀**
