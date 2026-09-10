/**
 * 创建初始管理员账号 admin / admin123（幂等）
 * 前置：数据库与表已存在（表由后端 TypeORM synchronize 自动创建）。
 * 用法：node scripts/seed-admin.js   （或 npm run db:seed，会先跑本脚本再灌演示数据）
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

// 载入 .env.development 的 DB_* 配置（环境变量可覆盖）
const envFile = path.join(__dirname, '..', '.env.development');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';

async function main() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'doctor_service_dev',
  });
  await client.connect();

  const existing = await client.query('SELECT id FROM users WHERE username = $1', [ADMIN_USERNAME]);
  if (existing.rows.length > 0) {
    console.log(`用户 ${ADMIN_USERNAME} 已存在，跳过创建`);
    await client.end();
    return;
  }

  const result = await client.query(
    `INSERT INTO users (username, email, password_hash, status, roles)
     VALUES ($1, $2, $3, 'active', $4)
     RETURNING id, username, email, roles`,
    [ADMIN_USERNAME, ADMIN_EMAIL, hash, 'admin'],
  );
  console.log('已创建管理员:', JSON.stringify(result.rows[0]));
  console.log(`  登录账号：${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
  await client.end();
}

main().catch((e) => {
  console.error('播种失败:', e.message);
  process.exit(1);
});
