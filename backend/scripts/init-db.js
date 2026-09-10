/**
 * 数据库初始化脚本（幂等）
 * 用途：为已有 PostgreSQL（非 Docker）的机器初始化本项目数据库：
 *   1. 若目标库不存在则创建；
 *   2. 安装 uuid-ossp 扩展（后端 uuid 主键依赖）。
 *
 * 配置来源：优先读 backend/.env.development 中的 DB_* 变量，可用环境变量覆盖。
 * 用法：node scripts/init-db.js   （或 npm run db:init）
 *
 * 说明：使用 Docker 的人无需此脚本——docker/initdb/ 下的 SQL 会在容器首次启动时自动执行。
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1) 载入 .env.development（不覆盖已存在的环境变量）
const envFile = path.join(__dirname, '..', '.env.development');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'doctor_service_dev',
};

async function main() {
  // 2) 连接到默认库 postgres，确保目标库存在
  const admin = new Client({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: 'postgres',
  });
  await admin.connect();

  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [cfg.database]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${cfg.database}"`);
    console.log(`✓ 已创建数据库 ${cfg.database}`);
  } else {
    console.log(`数据库 ${cfg.database} 已存在，跳过创建`);
  }
  await admin.end();

  // 3) 连接到目标库，安装扩展
  const db = new Client({ ...cfg, database: cfg.database });
  await db.connect();
  await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  console.log('✓ 已安装 uuid-ossp 扩展');

  const installed = await db.query('SELECT extname FROM pg_extension WHERE extname = $1', ['uuid-ossp']);
  console.log(installed.rowCount > 0 ? '  校验通过：uuid-ossp 可用' : '  ⚠ 校验失败：扩展未生效');
  await db.end();

  console.log('\n数据库初始化完成。下一步：');
  console.log('  1) 启动后端自动建表：npm run start:dev');
  console.log('  2) 播种账号与演示数据：npm run db:seed');
}

main().catch((e) => {
  console.error('数据库初始化失败:', e.message);
  process.exit(1);
});
