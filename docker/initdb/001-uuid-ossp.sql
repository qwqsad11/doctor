-- 安装 UUID 生成扩展。
-- 后端实体使用 uuid 主键（默认值 uuid_generate_v4()），PostgreSQL 需要此扩展。
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
