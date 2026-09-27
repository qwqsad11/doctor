// Enrich demo data for doctor_demo (doctor) and senior_demo (reviewer).
// Idempotent: re-running skips existing patients/records/plans/conferences/posts.
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env.development") });
const base = process.env.SEED_API_URL || "http://localhost:3001/api/v1";
const password = process.env.SEED_DEMO_PASSWORD || "Doctor123!";

async function api(route, token, body, method = body === undefined ? "GET" : "POST") {
  const res = await fetch(base + route, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(method + " " + route + ": " + res.status + " " + JSON.stringify(data));
  return data;
}

async function login(username) {
  const r = await api("/auth/login", null, {
    username,
    password,
    factor: "email",
    verification_code: "123456",
  });
  return { id: r.user.id, token: r.access_token };
}

async function ensurePatient(token, def) {
  const found = await api("/patients?keyword=" + encodeURIComponent(def.name), token);
  const existing = found.list.find((p) => p.name === def.name);
  if (existing) return { record: existing, created: false };
  const { name, gender, age, phone, group, symptom } = def;
  const record = await api("/patients", token, { name, gender, age, phone, group, symptom });
  return { record, created: true };
}

async function ensureRecord(token, patientId, def) {
  const found = await api("/emr?keyword=" + encodeURIComponent(def.diagnosis), token);
  const existing = found.list.find(
    (e) => e.patient_id === patientId && e.diagnosis === def.diagnosis,
  );
  if (existing) return { record: existing, created: false };
  const record = await api("/emr", token, { patient_id: patientId, ...def });
  return { record, created: true };
}

async function addOrders(token, record, orders) {
  let r = record;
  for (const o of orders) {
    if (r.orders.some((x) => x.name === o.name)) continue;
    r = await api("/emr/" + r.id + "/orders", token, o);
  }
  return r;
}

async function submitIfDraft(token, record, reviewerId) {
  return record.status === "草稿"
    ? api("/emr/" + record.id + "/submit", token, { reviewer_id: reviewerId })
    : record;
}

async function ensureHealth(token, patientId, def) {
  const found = await api("/health?keyword=" + encodeURIComponent(def.plan), token);
  const existing = found.list.find((h) => h.patient_id === patientId && h.plan === def.plan);
  if (existing) return { record: existing, created: false };
  const record = await api("/health", token, { patient_id: patientId, ...def });
  return { record, created: true };
}

async function ensureConsultation(token, patient, def) {
  const found = await api(
    "/consultations?keyword=" + encodeURIComponent(patient.name),
    token,
  );
  const existing = found.list.find((c) => c.patient_id === patient.id && c.type === def.type);
  if (existing) return { record: existing, created: false };
  const record = await api("/consultations", token, {
    patient_id: patient.id,
    type: def.type,
    symptom: def.symptom,
  });
  return { record, created: true };
}

async function ensurePost(token, def) {
  const found = await api("/social/posts?keyword=" + encodeURIComponent(def.title), token);
  const existing = found.list.find((p) => p.title === def.title);
  if (existing) return { record: existing, created: false };
  const record = await api("/social/posts", token, def);
  return { record, created: true };
}

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("此脚本仅用于本地验收环境");
  const doc = await login("doctor_demo");
  const senior = await login("senior_demo");
  const other = await login("doctor_other");
  const stats = { patients: 0, records: 0, health: 0, consultations: 0, conferences: 0, posts: 0 };

  // 1) 患者（归属 doctor_demo）
  const patientDefs = [
    { name: "李建国", gender: "男", age: 62, phone: "13800001101", group: "高血压", symptom: "反复头晕、血压波动" },
    { name: "周秀兰", gender: "女", age: 55, phone: "13900002202", group: "糖尿病", symptom: "乏力、口干多饮" },
    { name: "吴志强", gender: "男", age: 48, phone: "13700003303", group: "冠心病", symptom: "活动后胸闷、心悸" },
    { name: "郑桂芳", gender: "女", age: 67, phone: "13600004404", group: "慢阻肺", symptom: "慢性咳嗽、气促" },
    { name: "孙立军", gender: "男", age: 35, phone: "13500005505", group: "术后随访", symptom: "术后伤口复查" },
  ];
  const P = {};
  for (const def of patientDefs) {
    const { record, created } = await ensurePatient(doc.token, def);
    if (created) stats.patients++;
    if (def.name === "吴志强" && record.status !== "待随访")
      await api("/patients/" + record.id, doc.token, { status: "待随访" }, "PATCH");
    P[def.name] = record;
  }

  // 2) 电子病历：覆盖 草稿 / 待审核 / 已退回 / 已归档
  const outpatient = (s) => ({ 主诉: s.主诉, 现病史: s.现病史, 既往史: s.既往史, 过敏史: s.过敏史, 诊疗计划: s.诊疗计划 });

  let r = await ensureRecord(doc.token, P["李建国"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "高血压 2 级（中危）",
    structured_content: { 主诉: "反复头晕 2 年，加重 1 周", 现病史: "2 年前体检发现血压升高，未规律服药，近一周头晕明显", 既往史: "高脂血症 5 年", 过敏史: "无", 诊疗计划: "低盐饮食，规律服药，1 周后复诊" },
    content: "门诊记录：血压 158/96 mmHg，心率 76 次/分，建议控制体重并监测血压。",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(doc.token, r.record, [
    { category: "药物", name: "苯磺酸氨氯地平片 5mg", instruction: "每日一次，每次一片，晨起口服" },
    { category: "检查", name: "24 小时动态血压监测", instruction: "记录全天血压波动，一周内完成" },
  ]);

  r = await ensureRecord(doc.token, P["吴志强"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "冠状动脉粥样硬化性心脏病",
    structured_content: { 主诉: "活动后胸闷 3 个月", 现病史: "快走或上坡时胸闷，休息后缓解，近一个月发作频繁", 既往史: "高血压 8 年", 过敏史: "无", 诊疗计划: "控制危险因素，完善冠脉评估，必要时行冠脉造影" },
    content: "门诊记录：心电图提示 ST-T 改变，建议低盐低脂饮食并规律服药。",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(doc.token, r.record, [
    { category: "药物", name: "阿司匹林肠溶片 100mg", instruction: "每日一次，长期服用" },
    { category: "检验", name: "血脂四项 + 肝功能", instruction: "空腹抽血" },
  ]);

  r = await ensureRecord(doc.token, P["周秀兰"].id, {
    type: "住院病历", template_id: "inpatient", diagnosis: "2 型糖尿病伴血糖控制不佳",
    structured_content: { 主诉: "乏力、口干多饮 1 个月", 现病史: "确诊糖尿病 6 年，近期空腹血糖波动于 8～10 mmol/L", 既往史: "高血压 3 年", 过敏史: "无", 入院查体: "神清，心肺未见明显异常", 专科检查: "空腹血糖 9.2 mmol/L，糖化血红蛋白 8.4%", 入院诊断依据: "结合症状、血糖及糖化血红蛋白结果", 诊疗计划: "调整降糖方案，饮食运动指导，监测血糖" },
    content: "住院记录：调整降糖药物，开展糖尿病教育，出院前复查空腹及餐后血糖。",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);

  r = await ensureRecord(doc.token, P["郑桂芳"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "慢性阻塞性肺疾病急性加重",
    structured_content: { 主诉: "咳嗽、气促加重 3 天", 现病史: "慢阻肺病史 10 年，受凉后咳嗽咳痰加重，活动后气促明显", 既往史: "吸烟 40 年", 过敏史: "无", 诊疗计划: "抗感染、支气管舒张治疗，戒烟指导，必要时氧疗" },
    content: "门诊记录：双肺可闻及干湿啰音，血氧饱和度 92%，建议尽快完善胸部影像。",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);

  r = await ensureRecord(doc.token, P["孙立军"].id, {
    type: "体检报告", template_id: "checkup", diagnosis: "术后恢复期综合评估",
    structured_content: { 体检目的: "术后 3 个月恢复情况评估", 既往史: "半年前行腹腔镜手术", 过敏史: "无", 体格检查: "生命体征平稳，伤口愈合良好", 检验结果: "血常规、肝肾功能未见明显异常", 检查结论: "恢复良好，建议继续随访", 健康建议: "适当活动，避免剧烈运动，3 个月后复查" },
    content: "体检评估：各项指标基本正常，伤口愈合良好，建议逐步恢复日常活动。",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);
  if (r.record.status === "待审核")
    r.record = await api("/emr/" + r.record.id + "/review", senior.token, {
      decision: "reject",
      comment: "复查资料不完整，请补充近期影像学结果后重新提交。",
    });

  r = await ensureRecord(doc.token, P["李建国"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "高血压复诊（稳定）",
    structured_content: { 主诉: "头晕较前明显好转", 现病史: "规律服药 1 周，自测血压逐渐下降", 既往史: "高脂血症 5 年", 过敏史: "无", 诊疗计划: "维持当前降压方案，继续生活方式干预" },
    content: "复诊记录：血压 138/88 mmHg，头晕缓解，继续当前方案并定期随访。",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);
  if (r.record.status === "待审核")
    r.record = await api("/emr/" + r.record.id + "/review", senior.token, {
      decision: "approve",
      comment: "诊断明确，用药方案合理，同意归档。",
    });
  if (r.record.status === "已审核")
    r.record = await api("/emr/" + r.record.id + "/archive", doc.token, {});

  // 3) 健康管理
  let h = await ensureHealth(doc.token, P["李建国"].id, {
    plan: "高血压控制计划", goals: "将血压控制在 140/90 mmHg 以下", guidance: "低盐低脂饮食，规律作息，坚持每日测量血压", alert_level: "预警", metrics: "血压 150/95 mmHg", device_source: "家用电子血压计",
  });
  if (h.created) {
    stats.health++;
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血压", measured_at: new Date(Date.now() - 86400000).toISOString(), systolic: 150, diastolic: 95, source: "家用血压计", note: "晨起空腹测量",
    });
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血压", measured_at: new Date().toISOString(), systolic: 146, diastolic: 92, source: "家用血压计", note: "服药后复测",
    });
    await api("/health/" + h.record.id + "/assessments", doc.token, {
      conclusion: "血压较上次略有下降，仍高于目标值", advice: "继续规律服药，一周后复诊", alert_level: "预警", next_assessment_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    await api("/health/" + h.record.id + "/reminders", doc.token, {
      message: "记得早晚各测一次血压并上传", next_run_at: new Date(Date.now() + 86400000).toISOString(), interval_days: 1,
    });
  }

  h = await ensureHealth(doc.token, P["周秀兰"].id, {
    plan: "糖尿病饮食管理", goals: "空腹血糖稳定在 7 mmol/L 以下", guidance: "控制主食摄入，规律运动，按时监测血糖", alert_level: "正常", metrics: "空腹血糖 6.8 mmol/L",
  });
  if (h.created) {
    stats.health++;
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血糖", measured_at: new Date().toISOString(), glucose: 6.8, context: "空腹", source: "家用血糖仪", note: "晨起空腹",
    });
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血糖", measured_at: new Date(Date.now() - 86400000).toISOString(), glucose: 7.2, context: "餐后", source: "家用血糖仪", note: "晚餐后 2 小时",
    });
    await api("/health/" + h.record.id + "/assessments", doc.token, {
      conclusion: "血糖控制较前好转", advice: "维持当前饮食运动方案", alert_level: "正常", next_assessment_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
  }

  h = await ensureHealth(doc.token, P["郑桂芳"].id, {
    plan: "慢阻肺呼吸训练", goals: "改善活动后气促", guidance: "坚持缩唇呼吸与腹式呼吸训练，避免受凉", alert_level: "异常", metrics: "血氧饱和度 92%",
  });
  if (h.created) stats.health++;

  // 4) 在线问诊
  let c = await ensureConsultation(doc.token, P["吴志强"], { type: "图文", symptom: "活动后胸闷、心悸" });
  if (c.created) stats.consultations++;

  c = await ensureConsultation(doc.token, P["周秀兰"], { type: "视频", symptom: "乏力、口干多饮" });
  if (c.created) {
    stats.consultations++;
    await api("/consultations/" + c.record.id, doc.token, { status: "进行中" }, "PATCH");
  }

  c = await ensureConsultation(doc.token, P["李建国"], { type: "图文", symptom: "反复头晕" });
  if (c.created) {
    stats.consultations++;
    await api("/consultations/" + c.record.id, doc.token, {
      status: "已完成", advice: "建议低盐饮食，定期监测血压，按时服药",
    }, "PATCH");
  }

  // 5) 远程会诊（完整流程：发起 → 接受 → 开始 → 意见 → 完成）
  const confTopic = "高血压合并冠心病多学科会诊";
  let conf = (await api("/conferences?keyword=" + encodeURIComponent(confTopic), doc.token)).list.find(
    (x) => x.topic === confTopic,
  );
  if (!conf) {
    conf = await api("/conferences", doc.token, {
      topic: confTopic,
      patient_id: P["李建国"].id,
      expert_ids: [senior.id, other.id],
      summary: "就患者血压控制与冠心病二级预防方案进行多学科讨论。",
    });
    stats.conferences++;
  }
  conf = await api("/conferences/" + conf.id, doc.token);
  const seniorP = conf.participants.find((p) => p.id === senior.id);
  if (conf.status === "待会诊" && seniorP && seniorP.response === "待响应")
    await api("/conferences/" + conf.id + "/respond", senior.token, { response: "accept" });
  conf = await api("/conferences/" + conf.id, doc.token);
  if (conf.status === "待会诊" && conf.participants.some((p) => p.response === "已接受"))
    conf = await api("/conferences/" + conf.id, doc.token, { status: "进行中" }, "PATCH");
  if (conf.status === "进行中") {
    if (!conf.opinions.some((o) => o.user_id === senior.id))
      await api("/conferences/" + conf.id + "/opinions", senior.token, {
        content: "建议完善动态心电图与心脏超声，评估心功能后再调整用药。",
      });
    await api("/conferences/" + conf.id, doc.token, { status: "已完成" }, "PATCH");
  }

  // 6) 医生社交
  const posts = [
    { circle: "心血管内科", title: "一例难治性高血压的联合用药体会", content: "分享一例已脱敏的难治性高血压病例，探讨联合降压方案的选择与随访要点。" },
    { circle: "内分泌科", title: "糖尿病足早期识别与转诊要点", content: "门诊中如何通过足部查体快速识别糖尿病足高危患者（已脱敏）。" },
    { circle: "呼吸内科", title: "慢阻肺急性加重期雾化治疗的注意事项", content: "结合最新指南整理雾化药物的选择与操作要点（已脱敏）。" },
  ];
  for (const p of posts) {
    const { created } = await ensurePost(doc.token, p);
    if (created) stats.posts++;
  }

  // 7) doctor_other：呼吸内科患者与病历（数据隔离演示）
  const otherPatients = [
    { name: "陈桂香", gender: "女", age: 58, phone: "13400006601", group: "哮喘", symptom: "反复喘息、夜间咳嗽" },
    { name: "黄志明", gender: "男", age: 65, phone: "13300007702", group: "肺炎", symptom: "发热、咳嗽、咳痰" },
    { name: "罗玉梅", gender: "女", age: 42, phone: "13200008803", group: "慢性咳嗽", symptom: "干咳 2 个月" },
  ];
  const PO = {};
  for (const def of otherPatients) {
    const { record, created } = await ensurePatient(other.token, def);
    if (created) stats.patients++;
    if (def.name === "罗玉梅" && record.status !== "待随访")
      await api("/patients/" + record.id, other.token, { status: "待随访" }, "PATCH");
    PO[def.name] = record;
  }
  r = await ensureRecord(other.token, PO["陈桂香"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "支气管哮喘（急性发作）",
    structured_content: { 主诉: "反复喘息 1 周，加重 1 天", 现病史: "受凉后出现喘息、夜间咳嗽，活动后加重", 既往史: "哮喘 10 年", 过敏史: "花粉过敏", 诊疗计划: "吸入糖皮质激素，避免过敏原，定期随访" },
    content: "门诊记录：双肺可闻及散在哮鸣音，血氧 96%。",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(other.token, r.record, [
    { category: "药物", name: "布地奈德福莫特罗吸入剂", instruction: "每日两次，每次一吸" },
  ]);
  r = await ensureRecord(other.token, PO["黄志明"].id, {
    type: "住院病历", template_id: "inpatient", diagnosis: "社区获得性肺炎",
    structured_content: { 主诉: "发热、咳嗽咳痰 5 天", 现病史: "受凉后发热，最高 39℃，伴咳嗽咳黄痰", 既往史: "吸烟 30 年", 过敏史: "无", 入院查体: "右下肺呼吸音减弱，可闻及湿啰音", 专科检查: "血常规 WBC 升高，胸部 CT 示右下肺炎", 入院诊断依据: "结合病史、体征及影像学", 诊疗计划: "抗感染、祛痰、退热对症，观察病情" },
    content: "住院记录：经验性抗感染治疗，完善痰培养，监测体温。",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(other.token, r.record, senior.id);
  h = await ensureHealth(other.token, PO["陈桂香"].id, {
    plan: "哮喘控制计划", goals: "减少夜间发作，改善活动耐量", guidance: "规范吸入用药，记录峰流速，远离过敏原", alert_level: "预警", metrics: "峰流速 320 L/min",
  });
  if (h.created) stats.health++;

  // 8) senior_demo：内分泌科患者与病历（上级医生自有患者）
  const seniorPatients = [
    { name: "何秀英", gender: "女", age: 60, phone: "13100009901", group: "糖尿病", symptom: "多饮、多尿、体重下降" },
    { name: "冯丽华", gender: "女", age: 45, phone: "13000001102", group: "甲状腺", symptom: "心悸、手抖、消瘦" },
    { name: "曹永强", gender: "男", age: 52, phone: "13900002203", group: "糖尿病", symptom: "体检血糖偏高" },
  ];
  const PS = {};
  for (const def of seniorPatients) {
    const { record, created } = await ensurePatient(senior.token, def);
    if (created) stats.patients++;
    if (def.name === "曹永强" && record.status !== "待随访")
      await api("/patients/" + record.id, senior.token, { status: "待随访" }, "PATCH");
    PS[def.name] = record;
  }
  r = await ensureRecord(senior.token, PS["何秀英"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "2 型糖尿病",
    structured_content: { 主诉: "多饮多尿 3 个月", 现病史: "近 3 个月口渴多饮、夜尿增多，体重下降约 4kg", 既往史: "高血压 5 年", 过敏史: "无", 诊疗计划: "完善糖耐量与糖化血红蛋白，饮食运动干预，必要时药物" },
    content: "门诊记录：空腹血糖 8.9 mmol/L，建议完善检查后制定方案。",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(senior.token, r.record, [
    { category: "检验", name: "糖化血红蛋白 + 空腹血糖", instruction: "空腹抽血" },
  ]);
  r = await ensureRecord(senior.token, PS["冯丽华"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "甲状腺功能亢进",
    structured_content: { 主诉: "心悸、手抖、消瘦 2 个月", 现病史: "近 2 个月心悸、怕热多汗、手抖、体重下降", 既往史: "无特殊", 过敏史: "无", 诊疗计划: "完善甲功与甲状腺彩超，评估后抗甲亢治疗" },
    content: "门诊记录：心率 96 次/分，双侧甲状腺稍大，建议完善甲功。",
  });
  if (r.created) stats.records++;
  h = await ensureHealth(senior.token, PS["何秀英"].id, {
    plan: "糖尿病综合管理", goals: "空腹血糖控制在 7 mmol/L 以下", guidance: "饮食运动干预，定期监测血糖与糖化血红蛋白", alert_level: "正常", metrics: "空腹血糖 8.9 mmol/L",
  });
  if (h.created) stats.health++;

  console.log("丰富数据完成：");
  console.log(JSON.stringify(stats, null, 2));
  console.log("账号：doctor_demo（普通医生） / senior_demo（上级医生） 密码 " + password + "；验证码 123456");
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
