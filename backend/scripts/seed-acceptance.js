// Local acceptance accounts and data. Existing passwords, roles and records are preserved.
const path = require("node:path");
const { Client } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../.env.development") });
const base = process.env.SEED_API_URL || "http://localhost:3001/api/v1";
const password = process.env.SEED_DEMO_PASSWORD || "Doctor123!";
const accounts = [
  { username: "doctor_demo", name: "演示医生甲", roles: "doctor" },
  {
    username: "senior_demo",
    name: "演示上级医生",
    roles: "doctor,senior_doctor",
  },
  { username: "doctor_other", name: "演示医生乙", roles: "doctor" },
];
const db = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "doctor_service_dev",
});
async function api(
  route,
  token,
  body,
  method = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      method +
        " " +
        route +
        ": " +
        response.status +
        " " +
        JSON.stringify(data),
    );
  return data;
}
async function ensurePatient(token, name) {
  const found = await api(
    "/patients?keyword=" + encodeURIComponent(name),
    token,
  );
  return (
    found.list.find((p) => p.name === name) ||
    api("/patients", token, {
      name,
      gender: "男",
      age: 40,
      group: "功能验收",
      symptom: "虚构数据，仅用于功能验证",
    })
  );
}
async function ensureRecord(token, patient, diagnosis) {
  const found = await api(
    "/emr?keyword=" + encodeURIComponent(diagnosis),
    token,
  );
  const existing = found.list.find(
    (e) => e.patient_id === patient.id && e.diagnosis === diagnosis,
  );
  if (existing) return { record: existing, created: false };
  const record = await api("/emr", token, {
    patient_id: patient.id,
    type: "门诊病历",
    template_id: "outpatient",
    diagnosis,
    structured_content: {
      主诉: "结构化模板验收",
      现病史: "虚构记录，仅用于软件演示",
      过敏史: "待填写",
    },
    content: "可编辑此记录，验证医嘱、上级审核、退回重提和归档。",
  });
  await api("/emr/" + record.id + "/orders", token, {
    category: "检查",
    name: "演示检查医嘱",
    instruction: "仅用于验证医嘱修改与停止功能，不用于真实诊疗",
  });
  return { record, created: true };
}
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("此脚本仅用于本地验收环境");
  await db.connect();
  await db.query("SELECT pg_advisory_lock(hashtext('doctor-seed-acceptance'))");
  const sessions = {};
  for (const a of accounts) {
    let user = (
      await db.query(
        "SELECT id, username, roles, password_hash FROM users WHERE username=$1",
        [a.username],
      )
    ).rows[0];
    if (!user) {
      user = (
        await db.query(
          "INSERT INTO users(username,email,password_hash,status,roles,real_name,department) VALUES($1,$2,$3,'active',$4,$5,'演示科室') RETURNING id,username,roles",
          [
            a.username,
            a.username + "@demo.local",
            await bcrypt.hash(password, 10),
            a.roles,
            a.name,
          ],
        )
      ).rows[0];
      console.log("创建账号：" + a.username);
    } else {
      if (!(await bcrypt.compare(password, user.password_hash)))
        throw new Error(
          a.username +
            " 已存在且密码不同，未重置。请通过 SEED_DEMO_PASSWORD 提供该账号密码。",
        );
      if (user.roles !== a.roles)
        throw new Error(
          a.username + " 已存在但角色不同，未修改。请在管理授权中检查角色。",
        );
      console.log("保留已有账号：" + a.username);
    }
    const preset = {
      doctor_demo: { department: "心血管内科", title: "主治医师" },
      senior_demo: { department: "内分泌科", title: "主任医师" },
      doctor_other: { department: "呼吸内科", title: "住院医师" },
    }[a.username];
    await db.query(
      "UPDATE users SET department=CASE WHEN department IS NULL OR department='' OR department='演示科室' THEN $2 ELSE department END, title=COALESCE(NULLIF(title,''),$3) WHERE id=$1",
      [user.id, preset.department, preset.title],
    );
    const login = await api("/auth/login", null, {
      username: a.username,
      password,
      factor: "email",
      verification_code: "123456",
    });
    if (!login.access_token) throw new Error("登录验证失败：" + a.username);
    sessions[a.username] = { id: user.id, token: login.access_token };
  }
  const author = sessions.doctor_demo.token;
  const patient = await ensurePatient(author, "验收患者甲");
  await ensurePatient(sessions.doctor_other.token, "验收患者乙");
  await ensureRecord(author, patient, "验收草稿病历");
  const pending = await ensureRecord(author, patient, "验收待审核病历");
  if (pending.created)
    await api("/emr/" + pending.record.id + "/submit", author, {
      reviewer_id: sessions.senior_demo.id,
    });
  const plans = await api(
    "/health?keyword=" + encodeURIComponent("验收健康计划"),
    author,
  );
  let plan = plans.list.find(
    (p) => p.patient_id === patient.id && p.plan === "验收健康计划",
  );
  if (!plan) {
    plan = await api("/health", author, {
      patient_id: patient.id,
      plan: "验收健康计划",
      goals: "验证个人目标设置与监测数据记录",
      guidance: "此计划为软件演示，请按验收步骤上传虚构数据",
      alert_level: "正常",
    });
    await api("/health/" + plan.id + "/measurements", author, {
      kind: "血压",
      measured_at: new Date(Date.now() - 60000).toISOString(),
      systolic: 120,
      diastolic: 80,
      source: "模拟设备",
      note: "虚构验收数据",
    });
    await api("/health/" + plan.id + "/measurements", author, {
      kind: "血糖",
      measured_at: new Date().toISOString(),
      glucose: 5.5,
      context: "空腹",
      source: "模拟设备",
      note: "虚构验收数据",
    });
  }
  const conferenceTopic = "跨科室联合会诊演示";
  const conferences = await api(
    "/conferences?keyword=" + encodeURIComponent(conferenceTopic),
    author,
  );
  if (!conferences.list.some((c) => c.topic === conferenceTopic)) {
    await api("/conferences", author, {
      topic: conferenceTopic,
      patient_id: patient.id,
      expert_ids: [sessions.senior_demo.id, sessions.doctor_other.id],
      summary:
        "心血管内科邀请内分泌科、呼吸内科共同参与的虚构会诊，用于验证邀请与协作流程。",
    });
  }
  const own = await api("/emr", author);
  const review = await api("/emr", sessions.senior_demo.token);
  const other = await api("/emr", sessions.doctor_other.token);
  if (other.list.some((e) => e.patient_id === patient.id))
    throw new Error("医生乙错误看到了医生甲的病历");
  const response = await fetch(base + "/emr/" + pending.record.id, {
    headers: { Authorization: "Bearer " + sessions.doctor_other.token },
  });
  if (response.status !== 403) throw new Error("病历详情权限验证失败");
  console.log(
    JSON.stringify(
      {
        doctorRecords: own.total,
        assignedReviewRecords: review.total,
        otherDoctorRecords: other.total,
        healthPlan: plan.plan,
        crossDoctorAccess: response.status,
      },
      null,
      2,
    ),
  );
  console.log(
    "初始化完成。三个演示账号密码：" + password + "；短信/邮箱验证码：123456",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
