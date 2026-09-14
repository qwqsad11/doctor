/* Real HTTP + PostgreSQL regression tests. Creates and drops only its own unique test database. */
const assert = require("node:assert/strict");
const { Client } = require("pg");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env.development") });
const database = "doctor_workflow_test_" + Date.now();
const port = Number(process.env.WORKFLOW_TEST_PORT || 3101);
const base = "http://127.0.0.1:" + port + "/api/v1";
const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let server,
  db,
  admin,
  assertions = 0;
let serverOutput = "";
function check(value, label) {
  assert.ok(value, label);
  assertions++;
  console.log("PASS " + label);
}
async function api(
  route,
  { token, body, method = "GET", expected = 200, patientToken } = {},
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(patientToken ? { "x-patient-token": patientToken } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    method + " " + route + ": " + JSON.stringify(data),
  );
  assertions++;
  if (expected >= 400) {
    assert.doesNotMatch(JSON.stringify(data.message), /\p{Script=Han}/u, "API errors must use English");
    assertions++;
  }
  return data;
}
async function startServer() {
  server = spawn(process.execPath, ["dist/main.js"], {
    cwd: path.join(__dirname, ".."),
    windowsHide: true,
    env: {
      ...process.env,
      DB_NAME: database,
      PORT: String(port),
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (d) => {
    serverOutput = (serverOutput + d).slice(-100000);
  });
  server.stderr.on("data", (d) => {
    serverOutput = (serverOutput + d).slice(-100000);
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error("Test server exited: " + serverOutput.slice(-4000));
    try {
      const r = await fetch("http://127.0.0.1:" + port + "/api/docs");
      if (r.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error("Test server startup timed out");
}
async function stopServer() {
  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");
    server.kill();
    await stopped;
  }
}
async function main() {
  admin = new Client({ ...config, database: "postgres" });
  await admin.connect();
  await admin.query('CREATE DATABASE "' + database + '"');
  db = new Client({ ...config, database });
  await db.connect();
  await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await startServer();
  const account = async (username) =>
    api("/auth/register", {
      method: "POST",
      expected: 201,
      body: {
        username,
        email: username + "@example.com",
        password: "Workflow123!",
      },
    });
  const author = await account("workflow_author");
  const senior = await account("workflow_senior");
  const stranger = await account("workflow_stranger");
  const doctor = author.access_token;
  const other = stranger.access_token;
  await db.query(
    "UPDATE users SET roles = 'doctor,senior_doctor' WHERE id = $1",
    [senior.user.id],
  );
  const seniorLogin = await api("/auth/login", {
    method: "POST",
    expected: 200,
    body: {
      username: "workflow_senior",
      password: "Workflow123!",
      factor: "email",
      verification_code: "123456",
    },
  });
  const reviewer = seniorLogin.access_token;
  const patient = await api("/patients", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: { name: "回归验证患者", gender: "男", age: 40 },
  });
  const templates = await api("/emr/templates", { token: doctor });
  check(templates.length === 3, "three structured templates");
  const recordInput = {
    patient_id: patient.id,
    type: "门诊病历",
    template_id: "outpatient",
    diagnosis: "功能验证",
    structured_content: { 主诉: "验证模板字段", 现病史: "测试记录" },
  };
  await api("/emr", {
    method: "POST",
    expected: 403,
    token: other,
    body: recordInput,
  });
  await api("/emr", {
    method: "POST",
    expected: 400,
    token: doctor,
    body: { ...recordInput, structured_content: { invalid: "x" } },
  });
  const record = await api("/emr", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: recordInput,
  });
  const route = "/emr/" + record.id;
  await api(route, { token: other, expected: 403 });
  const unrelated = await api("/emr", { token: other });
  check(unrelated.total === 0, "doctor data isolation");
  await api(route, {
    method: "PATCH",
    expected: 400,
    token: doctor,
    body: { status: "已归档" },
  });
  await api(route, {
    method: "PATCH",
    expected: 400,
    token: doctor,
    body: { patient_id: patient.id },
  });
  for (const category of ["药物", "检查", "检验"]) {
    await api(route + "/orders", {
      method: "POST",
      expected: 201,
      token: doctor,
      body: {
        category,
        name: category + "测试医嘱",
        instruction: "仅验证流程",
      },
    });
  }
  let d = await api(route, { token: doctor });
  check(d.orders.length === 3, "all order categories stored");
  const order = d.orders[0];
  await api(route + "/orders/" + order.id, {
    method: "PATCH",
    token: doctor,
    body: { category: "药物", name: "已修改医嘱", instruction: "修改说明" },
  });
  d = await api(route + "/orders/" + order.id + "/stop", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: { reason: "结束测试医嘱" },
  });
  check(
    d.orders[0].status === "已停止" && d.orders[0].history.length === 3,
    "order edit and stop history retained",
  );
  await api(route + "/orders/" + order.id, {
    method: "PATCH",
    expected: 400,
    token: doctor,
    body: { category: "药物", name: "invalid", instruction: "invalid" },
  });
  await api(route + "/submit", {
    method: "POST",
    expected: 400,
    token: doctor,
    body: { reviewer_id: author.user.id },
  });
  await api(route + "/submit", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: { reviewer_id: senior.user.id },
  });
  await api(route, {
    method: "PATCH",
    expected: 400,
    token: doctor,
    body: { diagnosis: "不能修改待审核病历" },
  });
  await api(route + "/review", {
    method: "POST",
    expected: 403,
    token: doctor,
    body: { decision: "approve", comment: "不能自审" },
  });
  await api(route + "/archive", {
    method: "POST",
    expected: 400,
    token: doctor,
  });
  check(
    (await api("/emr", { token: reviewer })).total === 1,
    "assigned senior sees review queue",
  );
  await db.query("UPDATE users SET roles = 'doctor' WHERE id = $1", [
    senior.user.id,
  ]);
  await api(route + "/review", {
    method: "POST",
    expected: 403,
    token: reviewer,
    body: { decision: "approve", comment: "已撤销角色" },
  });
  await db.query(
    "UPDATE users SET roles = 'doctor,senior_doctor' WHERE id = $1",
    [senior.user.id],
  );
  await api(route + "/review", {
    method: "POST",
    expected: 201,
    token: reviewer,
    body: { decision: "reject", comment: "请补充检查信息" },
  });
  await api(route, {
    method: "PATCH",
    token: doctor,
    body: { content: "已补充" },
  });
  await api(route + "/submit", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: { reviewer_id: senior.user.id },
  });
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      fetch(base + route + "/review", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + reviewer,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision: "approve", comment: "通过最终审核" }),
      }),
    ),
  );
  check(
    concurrent
      .map((r) => r.status)
      .sort()
      .join(",") === "201,400",
    "concurrent review applies once",
  );
  d = await api(route + "/archive", {
    method: "POST",
    expected: 201,
    token: doctor,
  });
  check(
    d.status === "已归档" && !!d.archived_at && d.review_history.length === 5,
    "review and archive complete history",
  );
  await api(route, {
    method: "PATCH",
    expected: 400,
    token: doctor,
    body: { content: "禁止篡改归档" },
  });
  await api(route, { method: "DELETE", expected: 400, token: doctor });
  await api(route + "/orders", {
    method: "POST",
    expected: 400,
    token: doctor,
    body: { category: "检查", name: "禁止新医嘱", instruction: "已归档" },
  });
  const planInput = {
    patient_id: patient.id,
    plan: "个性化测试计划",
    goals: "记录健康目标",
    guidance: "记录个性化指导",
  };
  await api("/health", {
    method: "POST",
    expected: 403,
    token: other,
    body: planInput,
  });
  const plan = await api("/health", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: planInput,
  });
  const hp = "/health/" + plan.id;
  await api(hp, { token: other, expected: 403 });
  await api(hp, {
    method: "PATCH",
    expected: 400,
    token: doctor,
    body: { patient_id: patient.id },
  });
  const access = await api(hp + "/patient-access", {
    method: "POST",
    expected: 201,
    token: doctor,
  });
  check(
    !("patient_access_hash" in (await api(hp, { token: doctor }))),
    "patient token hash never returned",
  );
  await api("/health/patient-portal", { expected: 403 });
  const now = new Date().toISOString();
  const measurement = {
    kind: "血压",
    systolic: 120,
    diastolic: 80,
    measured_at: now,
    source: "测试设备",
  };
  await api("/health/patient-portal/measurements", {
    method: "POST",
    expected: 400,
    patientToken: access.token,
    body: { ...measurement, systolic: 50 },
  });
  await api("/health/patient-portal/measurements", {
    method: "POST",
    expected: 201,
    patientToken: access.token,
    body: measurement,
  });
  await api(hp + "/measurements", {
    method: "POST",
    expected: 403,
    token: other,
    body: measurement,
  });
  await api(hp + "/measurements", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: {
      kind: "血糖",
      glucose: 5.5,
      measured_at: new Date(Date.now() - 86400000).toISOString(),
      context: "空腹",
    },
  });
  d = await api(hp, { token: doctor });
  check(
    d.entries.filter((e) => e.kind === "measurement").length === 2 &&
      d.metrics.includes("120/80"),
    "patient uploads visible and historical uploads do not replace latest value",
  );
  await api(hp + "/assessments", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: {
      conclusion: "完成评估",
      advice: "按调整后的计划记录数据",
      alert_level: "预警",
      revised_plan: "调整后的计划",
      next_assessment_at: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  d = await api(hp, { token: doctor });
  check(
    d.plan === "调整后的计划" &&
      d.entries.some(
        (e) =>
          e.kind === "assessment" && e.data.previous_plan === planInput.plan,
      ),
    "assessment records previous plan and revised advice",
  );
  let portal = await api("/health/patient-portal", {
    patientToken: access.token,
  });
  check(
    portal.entries.some((e) => e.kind === "notification"),
    "assessment advice delivered to patient",
  );
  const nextAccess = await api(hp + "/patient-access", {
    method: "POST",
    expected: 201,
    token: doctor,
  });
  await api("/health/patient-portal", {
    expected: 403,
    patientToken: access.token,
  });
  await api("/health/patient-portal", { patientToken: nextAccess.token });
  const cancelled = await api(hp + "/reminders", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: {
      message: "不应发送",
      interval_days: 0,
      next_run_at: new Date(Date.now() + 1000).toISOString(),
    },
  });
  await api(hp + "/reminders/" + cancelled.id, {
    method: "DELETE",
    token: doctor,
  });
  const onceReminder = await api(hp + "/reminders", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: {
      message: "自动提醒验证",
      interval_days: 0,
      next_run_at: new Date(Date.now() + 1000).toISOString(),
    },
  });
  const repeated = await api(hp + "/reminders", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: {
      message: "周期提醒验证",
      interval_days: 1,
      next_run_at: new Date(Date.now() + 1000).toISOString(),
    },
  });
  await stopServer();
  await sleep(1300);
  await startServer();
  portal = await api("/health/patient-portal", {
    patientToken: nextAccess.token,
  });
  check(
    portal.entries.filter((e) => e.data.reminder_id === onceReminder.id)
      .length === 1,
    "overdue one-off reminder delivered after restart",
  );
  check(
    !portal.entries.some((e) => e.data.reminder_id === cancelled.id),
    "cancelled reminder never sent",
  );
  await sleep(16000);
  portal = await api("/health/patient-portal", {
    patientToken: nextAccess.token,
  });
  check(
    portal.entries.filter((e) => e.data.reminder_id === onceReminder.id)
      .length === 1,
    "reminder is not duplicated on subsequent timer tick",
  );
  d = await api(hp, { token: doctor });
  check(
    d.reminders.find((r) => r.id === repeated.id).enabled &&
      new Date(d.reminders.find((r) => r.id === repeated.id).next_run_at) >
        new Date(),
    "recurring reminder advances next due date",
  );
  check(
    (await api(route, { token: doctor })).status === "已归档",
    "archive survives restart",
  );
  await api(hp + "/patient-access", { method: "DELETE", token: doctor });
  await api("/health/patient-portal", {
    expected: 403,
    patientToken: nextAccess.token,
  });
  await require("./test-conferences")({api,check,doctor,reviewer,other,db,patient,base});
  if (process.env.WORKFLOW_BROWSER_TEST === "1")
    await require("./test-workflow-ui")({ base, doctor, reviewer });
  console.log("WORKFLOW REGRESSION PASSED: " + assertions + " assertions");
}
main()
  .catch((e) => {
    console.error(e);
    console.error(serverOutput.slice(-3000));
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer();
    if (db) await db.end();
    if (admin) {
      if (!/^doctor_workflow_test_[0-9]+$/.test(database))
        throw new Error("Unsafe test database name");
      await admin.query(
        'DROP DATABASE IF EXISTS "' + database + '" WITH (FORCE)',
      );
      await admin.end();
    }
  });
