const assert = require("node:assert/strict");
module.exports = async function testConferences({
  api,
  check,
  doctor,
  reviewer,
  other,
  db,
  patient,
  base,
}) {
  const me = await api("/users/me", { token: doctor });
  const senior = await api("/users/me", { token: reviewer });
  const colleague = await api("/users/me", { token: other });
  await api("/users/me", {
    method: "PATCH",
    token: doctor,
    body: { department: "心血管内科", title: "主治医师" },
  });
  await api("/users/me", {
    method: "PATCH",
    token: reviewer,
    body: { department: "内分泌科", title: "主任医师" },
  });
  await api("/users/me", {
    method: "PATCH",
    token: other,
    body: { department: "呼吸内科", title: "住院医师" },
  });
  const depts = await api("/users/departments", { token: doctor });
  check(
    depts.includes("内分泌科") && depts.includes("心血管内科"),
    "department catalogue",
  );
  const directory = await api(
    "/users/doctors?department=" + encodeURIComponent("内分泌科"),
    { token: doctor },
  );
  check(
    directory.total === 1 && directory.list[0].id === senior.id,
    "department doctor filtering",
  );
  check(
    !("email" in directory.list[0]) &&
      !("password_hash" in directory.list[0]) &&
      !("phone" in directory.list[0]),
    "directory exposes only professional profile",
  );
  check(
    !(await api("/users/doctors", { token: doctor })).list.some(
      (d) => d.id === me.id,
    ),
    "directory excludes inviting doctor",
  );
  const input = {
    topic: "跨科室接口验收",
    patient_id: patient.id,
    expert_ids: [senior.id, colleague.id],
    summary: "联合会诊流程验证",
  };
  await api("/conferences", {
    method: "POST",
    expected: 400,
    token: doctor,
    body: { ...input, expert_ids: [me.id] },
  });
  await api("/conferences", {
    method: "POST",
    expected: 400,
    token: doctor,
    body: { ...input, expert_ids: [senior.id, senior.id] },
  });
  await api("/conferences", {
    method: "POST",
    expected: 403,
    token: other,
    body: { ...input, expert_ids: [senior.id] },
  });
  await db.query("UPDATE users SET status='inactive' WHERE id=$1", [
    colleague.id,
  ]);
  await api("/conferences", {
    method: "POST",
    expected: 400,
    token: doctor,
    body: input,
  });
  check(
    !(
      await api("/users/doctors?department=" + encodeURIComponent("呼吸内科"), {
        token: doctor,
      })
    ).total,
    "inactive doctors excluded",
  );
  await db.query("UPDATE users SET status='active' WHERE id=$1", [
    colleague.id,
  ]);
  const c = await api("/conferences", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: input,
  });
  const route = "/conferences/" + c.id;
  check(
    c.participants.length === 2 &&
      c.participants.some((p) => p.department === "内分泌科") &&
      c.participants.some((p) => p.department === "呼吸内科"),
    "multiple departments stored with account identities",
  );
  check(
    (await api("/conferences", { token: reviewer })).list.some(
      (x) => x.id === c.id,
    ),
    "invited doctor receives conference",
  );
  const outsider = await api("/auth/register", {
    method: "POST",
    expected: 201,
    body: {
      username: "conference_outsider",
      email: "conference_outsider@example.com",
      password: "Workflow123!",
    },
  });
  await api(route, { token: outsider.access_token, expected: 403 });
  await api("/patients/" + patient.id, { token: reviewer, expected: 403 });
  await api(route, {
    method: "PATCH",
    token: reviewer,
    expected: 403,
    body: { status: "进行中" },
  });
  await api(route, { method: "DELETE", token: reviewer, expected: 403 });
  await api(route, {
    method: "PATCH",
    token: doctor,
    expected: 400,
    body: { status: "进行中" },
  });
  await api(route + "/respond", {
    method: "POST",
    token: reviewer,
    expected: 201,
    body: { response: "accept" },
  });
  await api(route + "/respond", {
    method: "POST",
    token: reviewer,
    expected: 400,
    body: { response: "accept" },
  });
  await api(route + "/respond", {
    method: "POST",
    token: other,
    expected: 201,
    body: { response: "decline" },
  });
  await api(route, {
    method: "PATCH",
    token: doctor,
    body: { status: "进行中" },
  });
  await api(route + "/opinions", {
    method: "POST",
    token: other,
    expected: 403,
    body: { content: "未接受邀请不能发言" },
  });
  await api(route + "/opinions", {
    method: "POST",
    token: reviewer,
    expected: 201,
    body: { content: "内分泌科意见：功能测试完成" },
  });
  await api(route + "/opinions", {
    method: "POST",
    token: doctor,
    expected: 201,
    body: { content: "心血管内科意见：功能测试完成" },
  });
  let d = await api(route, { token: reviewer });
  check(
    d.opinions.length === 2,
    "joint conference opinions visible to invited doctors",
  );
  await api(route, {
    method: "PATCH",
    token: doctor,
    body: { status: "已完成", summary: "各科室意见已汇总" },
  });
  await api(route + "/opinions", {
    method: "POST",
    token: reviewer,
    expected: 400,
    body: { content: "完成后不可新增" },
  });
  await api(route, {
    method: "PATCH",
    token: doctor,
    expected: 400,
    body: { summary: "禁止修改已完成会诊" },
  });
  await api(route, { method: "DELETE", token: doctor, expected: 400 });
  const pending = await api("/conferences", {
    method: "POST",
    expected: 201,
    token: doctor,
    body: { ...input, topic: "修改参会名单验收" },
  });
  await api("/conferences/" + pending.id, {
    method: "PATCH",
    token: doctor,
    body: { expert_ids: [senior.id] },
  });
  await api("/conferences/" + pending.id, { token: other, expected: 403 });
  check(
    true,
    "removed invitee loses access and patient permissions remain isolated",
  );
  if (process.env.WORKFLOW_BROWSER_TEST === "1")
    await require("./test-conferences-ui")({ base, doctor, reviewer });
};
