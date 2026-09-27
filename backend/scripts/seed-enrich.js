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
    throw new Error("This script is for local acceptance only");
  const doc = await login("doctor_demo");
  const senior = await login("senior_demo");
  const other = await login("doctor_other");
  const stats = { patients: 0, records: 0, health: 0, consultations: 0, conferences: 0, posts: 0 };

  // 1) Patients (owned by doctor_demo)
  const patientDefs = [
    { name: "James Li", gender: "男", age: 62, phone: "13800001101", group: "Hypertension", symptom: "Recurrent dizziness, fluctuating blood pressure" },
    { name: "Linda Zhou", gender: "女", age: 55, phone: "13900002202", group: "Diabetes", symptom: "Fatigue, dry mouth and polydipsia" },
    { name: "William Wu", gender: "男", age: 48, phone: "13700003303", group: "Coronary Heart Disease", symptom: "Chest tightness and palpitations on exertion" },
    { name: "Catherine Zheng", gender: "女", age: 67, phone: "13600004404", group: "COPD", symptom: "Chronic cough and shortness of breath" },
    { name: "Samuel Sun", gender: "男", age: 35, phone: "13500005505", group: "Post-surgery Follow-up", symptom: "Post-operative wound recheck" },
    { name: "George Brown", gender: "男", age: 58, phone: "13800002301", group: "Hypertension", symptom: "Occasional headache, elevated blood pressure", diagnosis: "Hypertension, Grade 1" },
    { name: "Patricia Davis", gender: "女", age: 52, phone: "13800002302", group: "Diabetes", symptom: "Increased thirst and fatigue", diagnosis: "Type 2 Diabetes" },
    { name: "John Wilson", gender: "男", age: 64, phone: "13800002303", group: "Hypertension", symptom: "Dizziness and blurred vision", diagnosis: "Hypertension, Grade 2" },
    { name: "Elizabeth Moore", gender: "女", age: 49, phone: "13800002304", group: "Diabetes", symptom: "Numbness in feet, fatigue", diagnosis: "Type 2 Diabetes with neuropathy" },
    { name: "Thomas Taylor", gender: "男", age: 61, phone: "13800002305", group: "Coronary Heart Disease", symptom: "Chest pain on exertion", diagnosis: "Coronary heart disease" },
    { name: "Barbara Anderson", gender: "女", age: 70, phone: "13800002306", group: "Hypertension", symptom: "Morning headache", diagnosis: "Hypertension, Grade 2" },
    { name: "Richard Thomas", gender: "男", age: 66, phone: "13800002307", group: "COPD", symptom: "Shortness of breath, chronic cough", diagnosis: "COPD" },
    { name: "Susan Jackson", gender: "女", age: 55, phone: "13800002308", group: "Diabetes", symptom: "Frequent urination, fatigue", diagnosis: "Type 2 Diabetes" },
    { name: "Joseph White", gender: "男", age: 47, phone: "13800002309", group: "Hypertension", symptom: "Elevated blood pressure on checkup", diagnosis: "Hypertension, Grade 1" },
    { name: "Margaret Harris", gender: "女", age: 43, phone: "13800002310", group: "Asthma", symptom: "Nocturnal wheezing", diagnosis: "Bronchial asthma" },
    { name: "Charles Martin", gender: "男", age: 59, phone: "13800002311", group: "Coronary Heart Disease", symptom: "Palpitations, chest tightness", diagnosis: "Coronary heart disease" },
    { name: "Dorothy Thompson", gender: "女", age: 63, phone: "13800002312", group: "Diabetes", symptom: "Blurred vision, thirst", diagnosis: "Type 2 Diabetes" },
    { name: "Paul Garcia", gender: "男", age: 54, phone: "13800002313", group: "Hypertension", symptom: "Dizziness on standing", diagnosis: "Hypertension, Grade 2" },
    { name: "Nancy Martinez", gender: "女", age: 41, phone: "13800002314", group: "Chronic Cough", symptom: "Persistent dry cough", diagnosis: "Chronic cough" },
    { name: "Kevin Robinson", gender: "男", age: 45, phone: "13800002315", group: "Thyroid", symptom: "Rapid heartbeat, weight loss", diagnosis: "Hyperthyroidism" },
  ];
  const P = {};
  for (const def of patientDefs) {
    const { record, created } = await ensurePatient(doc.token, def);
    if (created) stats.patients++;
    if (def.name === "William Wu" && record.status !== "待随访")
      await api("/patients/" + record.id, doc.token, { status: "待随访" }, "PATCH");
    P[def.name] = record;
  }

  // 1b) Simple outpatient record for each filler patient (keeps the EMR list populated)
  for (const def of patientDefs) {
    if (!def.diagnosis) continue;
    const rr = await ensureRecord(doc.token, P[def.name].id, {
      type: "门诊病历", template_id: "outpatient", diagnosis: def.diagnosis,
      structured_content: { 主诉: def.symptom, 现病史: "Presented for routine follow-up; condition generally stable.", 既往史: "None significant", 过敏史: "None", 诊疗计划: "Continue current management and follow up as scheduled." },
      content: "Outpatient note: stable on current treatment; advised to continue follow-up.",
    });
    if (rr.created) stats.records++;
  }

  // 2) EMR: cover Draft / Pending Review / Returned / Archived
  let r = await ensureRecord(doc.token, P["James Li"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Hypertension, Grade 2 (moderate risk)",
    structured_content: { 主诉: "Recurrent dizziness for 2 years, worsening over the past week", 现病史: "Elevated blood pressure found on a routine checkup 2 years ago; not on regular medication; dizziness more noticeable this week", 既往史: "Hyperlipidemia for 5 years", 过敏史: "None", 诊疗计划: "Low-salt diet, regular medication, follow-up in 1 week" },
    content: "Outpatient note: blood pressure 158/96 mmHg, heart rate 76 bpm. Advised weight control and blood pressure monitoring.",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(doc.token, r.record, [
    { category: "药物", name: "Amlodipine besylate 5 mg", instruction: "Once daily, one tablet in the morning" },
    { category: "检查", name: "24-hour ambulatory blood pressure monitoring", instruction: "Record blood pressure throughout the day; complete within one week" },
  ]);

  r = await ensureRecord(doc.token, P["William Wu"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Coronary atherosclerotic heart disease",
    structured_content: { 主诉: "Chest tightness on exertion for 3 months", 现病史: "Chest tightness when walking fast or climbing, relieved by rest; more frequent over the past month", 既往史: "Hypertension for 8 years", 过敏史: "None", 诊疗计划: "Control risk factors, complete coronary evaluation, coronary angiography if necessary" },
    content: "Outpatient note: ECG shows ST-T changes. Advised low-salt, low-fat diet and regular medication.",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(doc.token, r.record, [
    { category: "药物", name: "Aspirin enteric-coated tablet 100 mg", instruction: "Once daily, long-term" },
    { category: "检验", name: "Lipid profile + liver function", instruction: "Fasting blood draw" },
  ]);

  r = await ensureRecord(doc.token, P["Linda Zhou"].id, {
    type: "住院病历", template_id: "inpatient", diagnosis: "Type 2 diabetes with poor glycemic control",
    structured_content: { 主诉: "Fatigue, dry mouth and polydipsia for 1 month", 现病史: "Diagnosed with diabetes 6 years ago; recent fasting glucose fluctuating between 8 and 10 mmol/L", 既往史: "Hypertension for 3 years", 过敏史: "None", 入院查体: "Alert and oriented; no obvious cardiopulmonary abnormalities", 专科检查: "Fasting glucose 9.2 mmol/L, HbA1c 8.4%", 入院诊断依据: "Based on symptoms, blood glucose and HbA1c results", 诊疗计划: "Adjust glucose-lowering regimen, provide diet and exercise guidance, monitor blood glucose" },
    content: "Inpatient note: adjusted glucose-lowering medications, provided diabetes education, rechecked fasting and postprandial glucose before discharge.",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);

  r = await ensureRecord(doc.token, P["Catherine Zheng"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Acute exacerbation of COPD",
    structured_content: { 主诉: "Worsening cough and shortness of breath for 3 days", 现病史: "COPD for 10 years; cough and sputum worsened after catching a cold; marked dyspnea on exertion", 既往史: "Smoking for 40 years", 过敏史: "None", 诊疗计划: "Anti-infection and bronchodilator therapy, smoking cessation advice, oxygen therapy if needed" },
    content: "Outpatient note: coarse crackles and rhonchi in both lungs, SpO2 92%. Advised chest imaging as soon as possible.",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);

  r = await ensureRecord(doc.token, P["Samuel Sun"].id, {
    type: "体检报告", template_id: "checkup", diagnosis: "Comprehensive post-operative recovery assessment",
    structured_content: { 体检目的: "Assess recovery 3 months after surgery", 既往史: "Laparoscopic surgery 6 months ago", 过敏史: "None", 体格检查: "Stable vital signs, wound healing well", 检验结果: "Blood count, liver and kidney function within normal limits", 检查结论: "Good recovery; continue follow-up", 健康建议: "Moderate activity, avoid strenuous exercise, recheck in 3 months" },
    content: "Assessment: all indicators essentially normal, wound healing well. Advised gradual return to daily activities.",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);
  if (r.record.status === "待审核")
    r.record = await api("/emr/" + r.record.id + "/review", senior.token, {
      decision: "reject",
      comment: "Follow-up data is incomplete. Please add recent imaging results and resubmit.",
    });

  r = await ensureRecord(doc.token, P["James Li"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Hypertension follow-up (stable)",
    structured_content: { 主诉: "Dizziness significantly improved", 现病史: "On regular medication for 1 week; self-measured blood pressure gradually decreasing", 既往史: "Hyperlipidemia for 5 years", 过敏史: "None", 诊疗计划: "Maintain current antihypertensive regimen, continue lifestyle modification" },
    content: "Follow-up note: blood pressure 138/88 mmHg, dizziness relieved. Continue current regimen and regular follow-up.",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(doc.token, r.record, senior.id);
  if (r.record.status === "待审核")
    r.record = await api("/emr/" + r.record.id + "/review", senior.token, {
      decision: "approve",
      comment: "Diagnosis is clear and the medication regimen is appropriate. Approved for archiving.",
    });
  if (r.record.status === "已审核")
    r.record = await api("/emr/" + r.record.id + "/archive", doc.token, {});

  // 3) Health management
  let h = await ensureHealth(doc.token, P["James Li"].id, {
    plan: "Hypertension Control Plan", goals: "Keep blood pressure below 140/90 mmHg", guidance: "Low-salt, low-fat diet, regular sleep, measure blood pressure daily", alert_level: "预警", metrics: "Blood pressure 150/95 mmHg", device_source: "Home electronic blood pressure monitor",
  });
  if (h.created) {
    stats.health++;
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血压", measured_at: new Date(Date.now() - 86400000).toISOString(), systolic: 150, diastolic: 95, source: "Home blood pressure monitor", note: "Fasting measurement in the morning",
    });
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血压", measured_at: new Date().toISOString(), systolic: 146, diastolic: 92, source: "Home blood pressure monitor", note: "Rechecked after medication",
    });
    await api("/health/" + h.record.id + "/assessments", doc.token, {
      conclusion: "Blood pressure slightly lower than before but still above target", advice: "Continue regular medication, follow-up in one week", alert_level: "预警", next_assessment_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    await api("/health/" + h.record.id + "/reminders", doc.token, {
      message: "Remember to measure and upload your blood pressure morning and evening", next_run_at: new Date(Date.now() + 86400000).toISOString(), interval_days: 1,
    });
  }

  h = await ensureHealth(doc.token, P["Linda Zhou"].id, {
    plan: "Diabetes Dietary Management", goals: "Keep fasting glucose stable below 7 mmol/L", guidance: "Control staple food intake, exercise regularly, monitor glucose on schedule", alert_level: "正常", metrics: "Fasting glucose 6.8 mmol/L",
  });
  if (h.created) {
    stats.health++;
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血糖", measured_at: new Date().toISOString(), glucose: 6.8, context: "空腹", source: "Home glucose meter", note: "Fasting in the morning",
    });
    await api("/health/" + h.record.id + "/measurements", doc.token, {
      kind: "血糖", measured_at: new Date(Date.now() - 86400000).toISOString(), glucose: 7.2, context: "餐后", source: "Home glucose meter", note: "2 hours after dinner",
    });
    await api("/health/" + h.record.id + "/assessments", doc.token, {
      conclusion: "Glycemic control improved", advice: "Maintain current diet and exercise plan", alert_level: "正常", next_assessment_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
  }

  h = await ensureHealth(doc.token, P["Catherine Zheng"].id, {
    plan: "COPD Breathing Training", goals: "Improve dyspnea on exertion", guidance: "Practice pursed-lip and diaphragmatic breathing, avoid catching cold", alert_level: "异常", metrics: "SpO2 92%",
  });
  if (h.created) stats.health++;

  // 4) Online consultations
  let c = await ensureConsultation(doc.token, P["William Wu"], { type: "图文", symptom: "Chest tightness and palpitations on exertion" });
  if (c.created) stats.consultations++;

  c = await ensureConsultation(doc.token, P["Linda Zhou"], { type: "视频", symptom: "Fatigue, dry mouth and polydipsia" });
  if (c.created) {
    stats.consultations++;
    await api("/consultations/" + c.record.id, doc.token, { status: "进行中" }, "PATCH");
  }

  c = await ensureConsultation(doc.token, P["James Li"], { type: "图文", symptom: "Recurrent dizziness" });
  if (c.created) {
    stats.consultations++;
    await api("/consultations/" + c.record.id, doc.token, {
      status: "已完成", advice: "Low-salt diet, regular blood pressure monitoring, take medication on schedule",
    }, "PATCH");
  }

  // 5) Remote conference (full flow: initiate -> accept -> start -> opinion -> complete)
  const confTopic = "Multidisciplinary Conference: Hypertension with CHD";
  let conf = (await api("/conferences?keyword=" + encodeURIComponent(confTopic), doc.token)).list.find(
    (x) => x.topic === confTopic,
  );
  if (!conf) {
    conf = await api("/conferences", doc.token, {
      topic: confTopic,
      patient_id: P["James Li"].id,
      expert_ids: [senior.id, other.id],
      summary: "Multidisciplinary discussion on blood pressure control and secondary prevention of coronary heart disease.",
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
        content: "Recommend completing ambulatory ECG and echocardiography, and evaluating cardiac function before adjusting medication.",
      });
    await api("/conferences/" + conf.id, doc.token, { status: "已完成" }, "PATCH");
  }

  // 6) Doctor community
  const posts = [
    { circle: "Cardiology", title: "Combination therapy in a case of refractory hypertension", content: "Sharing a de-identified case of refractory hypertension and discussing combination antihypertensive options and follow-up points." },
    { circle: "Endocrinology", title: "Early recognition and referral of diabetic foot", content: "How to quickly identify high-risk diabetic foot patients through foot examination in the clinic (de-identified)." },
    { circle: "Respiratory Medicine", title: "Nebulization therapy in COPD acute exacerbation", content: "Key points for selecting and administering nebulized medications based on the latest guidelines (de-identified)." },
  ];
  for (const p of posts) {
    const { created } = await ensurePost(doc.token, p);
    if (created) stats.posts++;
  }

  // 7) doctor_other: respiratory patients and records (data isolation demo)
  const otherPatients = [
    { name: "Grace Chen", gender: "女", age: 58, phone: "13400006601", group: "Asthma", symptom: "Recurrent wheezing, nocturnal cough" },
    { name: "Henry Huang", gender: "男", age: 65, phone: "13300007702", group: "Pneumonia", symptom: "Fever, cough, sputum" },
    { name: "Rose Luo", gender: "女", age: 42, phone: "13200008803", group: "Chronic Cough", symptom: "Dry cough for 2 months" },
  ];
  const PO = {};
  for (const def of otherPatients) {
    const { record, created } = await ensurePatient(other.token, def);
    if (created) stats.patients++;
    if (def.name === "Rose Luo" && record.status !== "待随访")
      await api("/patients/" + record.id, other.token, { status: "待随访" }, "PATCH");
    PO[def.name] = record;
  }
  r = await ensureRecord(other.token, PO["Grace Chen"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Bronchial asthma (acute attack)",
    structured_content: { 主诉: "Recurrent wheezing for 1 week, worse for 1 day", 现病史: "Wheezing and nocturnal cough after catching a cold, worse on exertion", 既往史: "Asthma for 10 years", 过敏史: "Pollen allergy", 诊疗计划: "Inhaled corticosteroids, avoid allergens, regular follow-up" },
    content: "Outpatient note: scattered wheezing in both lungs, SpO2 96%.",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(other.token, r.record, [
    { category: "药物", name: "Budesonide/formoterol inhaler", instruction: "One inhalation twice daily" },
  ]);
  r = await ensureRecord(other.token, PO["Henry Huang"].id, {
    type: "住院病历", template_id: "inpatient", diagnosis: "Community-acquired pneumonia",
    structured_content: { 主诉: "Fever, cough and sputum for 5 days", 现病史: "Fever up to 39°C after catching a cold, with cough and yellow sputum", 既往史: "Smoking for 30 years", 过敏史: "None", 入院查体: "Decreased breath sounds over the right lower lung, with crackles", 专科检查: "Elevated WBC, chest CT shows right lower lobe pneumonia", 入院诊断依据: "Based on history, physical signs and imaging", 诊疗计划: "Anti-infective and mucolytic therapy, antipyretics, observe" },
    content: "Inpatient note: empirical anti-infective treatment, sputum culture ordered, temperature monitoring.",
  });
  if (r.created) stats.records++;
  r.record = await submitIfDraft(other.token, r.record, senior.id);
  h = await ensureHealth(other.token, PO["Grace Chen"].id, {
    plan: "Asthma Control Plan", goals: "Reduce nocturnal attacks and improve exercise tolerance", guidance: "Use inhalers correctly, record peak flow, avoid allergens", alert_level: "预警", metrics: "Peak flow 320 L/min",
  });
  if (h.created) stats.health++;

  // 8) senior_demo: endocrinology patients and records (senior doctor's own patients)
  const seniorPatients = [
    { name: "Helen He", gender: "女", age: 60, phone: "13100009901", group: "Diabetes", symptom: "Polydipsia, polyuria, weight loss" },
    { name: "Fiona Feng", gender: "女", age: 45, phone: "13000001102", group: "Thyroid", symptom: "Palpitations, tremor, weight loss" },
    { name: "Charles Cao", gender: "男", age: 52, phone: "13900002203", group: "Diabetes", symptom: "Elevated glucose on routine checkup" },
  ];
  const PS = {};
  for (const def of seniorPatients) {
    const { record, created } = await ensurePatient(senior.token, def);
    if (created) stats.patients++;
    if (def.name === "Charles Cao" && record.status !== "待随访")
      await api("/patients/" + record.id, senior.token, { status: "待随访" }, "PATCH");
    PS[def.name] = record;
  }
  r = await ensureRecord(senior.token, PS["Helen He"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Type 2 Diabetes",
    structured_content: { 主诉: "Polydipsia and polyuria for 3 months", 现病史: "Thirst and polydipsia, increased nocturia, weight loss of about 4 kg over 3 months", 既往史: "Hypertension for 5 years", 过敏史: "None", 诊疗计划: "Complete glucose tolerance test and HbA1c, diet and exercise intervention, medication if needed" },
    content: "Outpatient note: fasting glucose 8.9 mmol/L. Advised completing tests before finalizing a plan.",
  });
  if (r.created) stats.records++;
  r.record = await addOrders(senior.token, r.record, [
    { category: "检验", name: "HbA1c + fasting glucose", instruction: "Fasting blood draw" },
  ]);
  r = await ensureRecord(senior.token, PS["Fiona Feng"].id, {
    type: "门诊病历", template_id: "outpatient", diagnosis: "Hyperthyroidism",
    structured_content: { 主诉: "Palpitations, tremor and weight loss for 2 months", 现病史: "Palpitations, heat intolerance, sweating, tremor and weight loss over 2 months", 既往史: "Nothing significant", 过敏史: "None", 诊疗计划: "Complete thyroid function tests and thyroid ultrasound; anti-thyroid treatment after evaluation" },
    content: "Outpatient note: heart rate 96 bpm, mildly enlarged thyroid. Advised completing thyroid function tests.",
  });
  if (r.created) stats.records++;
  h = await ensureHealth(senior.token, PS["Helen He"].id, {
    plan: "Comprehensive Diabetes Management", goals: "Keep fasting glucose below 7 mmol/L", guidance: "Diet and exercise intervention, regular glucose and HbA1c monitoring", alert_level: "正常", metrics: "Fasting glucose 8.9 mmol/L",
  });
  if (h.created) stats.health++;

  console.log("Enrichment complete:");
  console.log(JSON.stringify(stats, null, 2));
  console.log("Accounts: doctor_demo (Doctor) / senior_demo (Senior Doctor), password " + password + "; verification code 123456");
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
