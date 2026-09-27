// Local acceptance accounts and data. Existing passwords, roles and records are preserved.
const path = require("node:path");
const { Client } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../.env.development") });
const base = process.env.SEED_API_URL || "http://localhost:3001/api/v1";
const password = process.env.SEED_DEMO_PASSWORD || "Doctor123!";
const accounts = [
  { username: "doctor_demo", name: "Demo Doctor A", roles: "doctor" },
  {
    username: "senior_demo",
    name: "Demo Senior Doctor",
    roles: "doctor,senior_doctor",
  },
  { username: "doctor_other", name: "Demo Doctor B", roles: "doctor" },
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
      group: "Functional Acceptance",
      symptom: "Fictional data for functional testing",
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
      主诉: "Structured template acceptance",
      现病史: "Fictional record for software demo only",
      过敏史: "To be completed",
    },
    content: "Edit this record to verify orders, senior review, return, and archiving.",
  });
  await api("/emr/" + record.id + "/orders", token, {
    category: "检查",
    name: "Demo examination order",
    instruction: "For verifying order edit and stop functions only; not for real treatment",
  });
  return { record, created: true };
}
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("This script is for local acceptance only");
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
          "INSERT INTO users(username,email,password_hash,status,roles,real_name,department) VALUES($1,$2,$3,'active',$4,$5,'Demo Department') RETURNING id,username,roles",
          [
            a.username,
            a.username + "@demo.local",
            await bcrypt.hash(password, 10),
            a.roles,
            a.name,
          ],
        )
      ).rows[0];
      console.log("Created account: " + a.username);
    } else {
      if (!(await bcrypt.compare(password, user.password_hash)))
        throw new Error(
          a.username +
            " already exists with a different password and was not reset. Provide its password via SEED_DEMO_PASSWORD.",
        );
      if (user.roles !== a.roles)
        throw new Error(
          a.username + " already exists with different roles and was not modified. Check its roles in Access Management.",
        );
      console.log("Kept existing account: " + a.username);
    }
    const preset = {
      doctor_demo: { department: "心血管内科", title: "主治医师" },
      senior_demo: { department: "内分泌科", title: "主任医师" },
      doctor_other: { department: "呼吸内科", title: "住院医师" },
    }[a.username];
    await db.query(
      "UPDATE users SET department=CASE WHEN department IS NULL OR department='' OR department='Demo Department' THEN $2 ELSE department END, title=COALESCE(NULLIF(title,''),$3) WHERE id=$1",
      [user.id, preset.department, preset.title],
    );
    const login = await api("/auth/login", null, {
      username: a.username,
      password,
      factor: "email",
      verification_code: "123456",
    });
    if (!login.access_token) throw new Error("Login verification failed: " + a.username);
    sessions[a.username] = { id: user.id, token: login.access_token };
  }
  const author = sessions.doctor_demo.token;
  const patient = await ensurePatient(author, "Acceptance Patient A");
  await ensurePatient(sessions.doctor_other.token, "Acceptance Patient B");
  await ensureRecord(author, patient, "Acceptance Draft Record");
  const pending = await ensureRecord(author, patient, "Acceptance Pending Review Record");
  if (pending.created)
    await api("/emr/" + pending.record.id + "/submit", author, {
      reviewer_id: sessions.senior_demo.id,
    });
  const plans = await api(
    "/health?keyword=" + encodeURIComponent("Acceptance Health Plan"),
    author,
  );
  let plan = plans.list.find(
    (p) => p.patient_id === patient.id && p.plan === "Acceptance Health Plan",
  );
  if (!plan) {
    plan = await api("/health", author, {
      patient_id: patient.id,
      plan: "Acceptance Health Plan",
      goals: "Verify personal goal setting and measurement recording",
      guidance: "This plan is for the software demo; upload fictional data following the acceptance steps",
      alert_level: "正常",
    });
    await api("/health/" + plan.id + "/measurements", author, {
      kind: "血压",
      measured_at: new Date(Date.now() - 60000).toISOString(),
      systolic: 120,
      diastolic: 80,
      source: "Simulated device",
      note: "Fictional acceptance data",
    });
    await api("/health/" + plan.id + "/measurements", author, {
      kind: "血糖",
      measured_at: new Date().toISOString(),
      glucose: 5.5,
      context: "空腹",
      source: "Simulated device",
      note: "Fictional acceptance data",
    });
  }
  const conferenceTopic = "Cross-Department Joint Conference Demo";
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
        "A fictional conference in which Cardiology invites Endocrinology and Respiratory Medicine to verify the invitation and collaboration flow.",
    });
  }
  const own = await api("/emr", author);
  const review = await api("/emr", sessions.senior_demo.token);
  const other = await api("/emr", sessions.doctor_other.token);
  if (other.list.some((e) => e.patient_id === patient.id))
    throw new Error("Doctor B incorrectly sees Doctor A's record");
  const response = await fetch(base + "/emr/" + pending.record.id, {
    headers: { Authorization: "Bearer " + sessions.doctor_other.token },
  });
  if (response.status !== 403) throw new Error("Record detail permission check failed");
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
    "Initialization complete. Demo account passwords: " + password + "; SMS/email verification code: 123456",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
