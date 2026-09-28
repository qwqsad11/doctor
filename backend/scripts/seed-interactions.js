/**
 * 为医生社区（帖子）与医生协作（会诊）灌入评论 + 点赞演示数据（幂等）。
 * 用法：先启动后端，再 `node scripts/seed-interactions.js [PORT]`
 *
 * 会额外创建两个演示医生账号（Dr. Wang / Dr. Li）作为评论作者，使社区内容更真实。
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PORT = process.argv[2] || '3001';
const BASE = process.env.SEED_API_URL || `http://localhost:${PORT}/api/v1`;

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

async function api(route, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + route, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${route} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function login(username, password) {
  const r = await api('/auth/login', {
    method: 'POST',
    body: { username, password, factor: 'email', verification_code: '123456' },
  });
  return { id: r.user?.id, token: r.access_token };
}

const DEMO_DOCTORS = [
  { username: 'Dr. Wang', email: 'dr.wang@example.com', password: 'Doctor123!', real_name: 'Dr. Wang', department: 'Cardiology', title: 'Attending Physician' },
  { username: 'Dr. Li', email: 'dr.li@example.com', password: 'Doctor123!', real_name: 'Dr. Li', department: 'Respiratory Medicine', title: 'Chief Resident' },
];

async function ensureDoctors() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'doctor_service_dev',
  });
  await client.connect();
  for (const d of DEMO_DOCTORS) {
    const exists = await client.query('SELECT id FROM users WHERE username = $1', [d.username]);
    if (exists.rows.length === 0) {
      const hash = await bcrypt.hash(d.password, 10);
      await client.query(
        `INSERT INTO users (username, email, password_hash, status, roles, real_name, department, title)
         VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)`,
        [d.username, d.email, hash, 'doctor', d.real_name, d.department, d.title],
      );
      console.log('✓ Doctor created:', d.username);
    }
  }
  await client.end();
}

// 帖子（社区）评论池
const POST_COMMENTS = [
  'Thanks for sharing. In refractory hypertension, have you ruled out secondary causes such as renal artery stenosis or primary aldosteronism?',
  'Consider verifying medication adherence and home blood pressure monitoring before escalating the regimen.',
  'A useful checklist — also worth screening for obstructive sleep apnea in these patients.',
  'Adding a low-dose thiazide-like diuretic (chlorthalidone) often helps reach target as part of combination therapy.',
  'Good reminder on de-identification. Always strip dates of birth and rare disease markers before posting.',
  'I would be interested in the 4-week follow-up to see how the combination is tolerated.',
  'For the COPD case, document the exacerbation severity to guide outpatient versus inpatient care.',
  'Early diabetic foot screening should include monofilament and vibration testing, not inspection alone.',
];

// 会诊（协作）评论池
const CONSULT_COMMENTS = [
  'Reviewed the record. Suggest a 24h ambulatory BP monitor to confirm the diagnosis before treatment.',
  'Please add the recent lab results (creatinine, electrolytes) to the record for completeness.',
  'The plan looks reasonable; ensure the patient is scheduled for a follow-up within two weeks.',
  'Note: the chest tightness warrants an ECG and, if indicated, a cardiac enzyme panel.',
  'Advice documented clearly. Consider adding medication reconciliation at the next visit.',
];

// 给某个目标（post / consultation）灌入点赞与评论。tokens 为可用的作者 token 列表。
async function seedTarget(kind, target, tokens, pool) {
  const prefix = kind === 'post' ? `/social/posts/${target.id}` : `/consultations/${target.id}`;
  const existing = await api(`${prefix}/comments`, { token: tokens[0].token });
  if (existing.total > 0) return false; // 已存在，跳过（幂等）

  // 点赞：所有作者各点一次（保证计数真实）
  for (const u of tokens) {
    await api(`${prefix}/like`, { method: 'POST', token: u.token });
  }

  // 评论：取 2~4 条，作者轮流
  const n = Math.min(pool.length, 2 + (Math.abs(hashCode(target.id)) % 3));
  for (let i = 0; i < n; i++) {
    const text = pool[(hashCode(target.id) + i) % pool.length];
    const author = tokens[i % tokens.length];
    await api(`${prefix}/comments`, {
      method: 'POST',
      token: author.token,
      body: { content: text },
    });
  }
  return true;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

async function main() {
  await ensureDoctors();

  const admin = await login('admin', 'admin123');
  const wang = await login('Dr. Wang', 'Doctor123!');
  const li = await login('Dr. Li', 'Doctor123!');
  const authors = [admin, wang, li];

  // 帖子（医生社区）——所有人可访问
  const posts = await api('/social/posts?pageSize=100', { token: admin.token });
  let postSeeded = 0;
  for (const post of posts.list) {
    if (await seedTarget('post', post, authors, POST_COMMENTS)) postSeeded++;
  }
  console.log(`✓ Posts seeded with likes/comments: ${postSeeded}/${posts.list.length}`);

  // 会诊（医生协作）——admin 拥有全部会诊，用 admin 作为作者
  const consults = await api('/consultations?pageSize=100', { token: admin.token });
  let consultSeeded = 0;
  for (const c of consults.list) {
    if (await seedTarget('consultation', c, [admin], CONSULT_COMMENTS)) consultSeeded++;
  }
  console.log(`✓ Consultations seeded with likes/comments: ${consultSeeded}/${consults.list.length}`);

  console.log('\nInteractions seed complete ✅');
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
