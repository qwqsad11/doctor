/**
 * Demo data seed script (idempotent; writes through the backend API, using real business logic + audit).
 * Usage: start the backend first, then `node scripts/seed-demo-data.js [PORT]`
 */
const PORT = process.argv[2] || '3001';
const BASE = `http://localhost:${PORT}/api/v1`;

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const { access_token: t } = await api('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123', factor: 'email', verification_code: '123456' },
  });

  // 1) Clean up leftover "Test Patient" records from smoke tests
  const leftovers = await api('/patients?keyword=Test Patient&pageSize=100', { token: t });
  for (const p of leftovers.list) {
    await api(`/patients/${p.id}`, { method: 'DELETE', token: t });
  }

  // 2) Idempotent: skip if demo data already exists
  const existing = await api('/patients?keyword=David Zhang', { token: t });
  if (existing.total > 0) {
    console.log('Demo data already exists, skipping seed');
    return;
  }

  // 3) Patients
  const patientsDef = [
    { name: 'David Zhang', gender: '男', age: 58, phone: '13800002211', group: 'Hypertension', symptom: 'Dizziness', status: '在管' },
    { name: 'Mary Wang', gender: '女', age: 46, phone: '13900008820', group: 'Diabetes', symptom: 'Fatigue', status: '在管' },
    { name: 'Michael Liu', gender: '男', age: 63, phone: '13700006645', group: 'Coronary Heart Disease', symptom: 'Chest tightness', status: '待随访' },
    { name: 'Jennifer Chen', gender: '女', age: 39, phone: '13600001102', group: 'COPD', symptom: 'Cough', status: '在管' },
    { name: 'Robert Zhao', gender: '男', age: 71, phone: '13500009901', group: 'Hypertension', symptom: 'Palpitations', status: '已转出' },
  ];
  const pid = {};
  for (const p of patientsDef) {
    const { status, ...body } = p;
    const created = await api('/patients', { method: 'POST', token: t, body });
    pid[p.name] = created.id;
    if (status !== '在管') {
      await api(`/patients/${created.id}`, { method: 'PATCH', token: t, body: { status } });
    }
    console.log('✓ Patient', created.patient_no, p.name);
  }

  // 4) Electronic medical records
  const emrDef = [
    { name: 'David Zhang', type: '门诊病历', diagnosis: 'Hypertension, Grade 2', status: '待审核' },
    { name: 'Mary Wang', type: '住院病历', diagnosis: 'Type 2 Diabetes', status: '已归档' },
    { name: 'Michael Liu', type: '门诊病历', diagnosis: 'Coronary Heart Disease', status: '草稿' },
    { name: 'Jennifer Chen', type: '体检报告', diagnosis: 'COPD', status: '已退回' },
  ];
  for (const e of emrDef) {
    const created = await api('/emr', {
      method: 'POST',
      token: t,
      body: { patient_id: pid[e.name], type: e.type, diagnosis: e.diagnosis },
    });
    // Seed drafts only; audited states must use the real assigned-reviewer workflow.
    console.log('✓ Record', created.emr_no, e.name, created.status);
  }

  // 5) Online consultations
  const conDef = [
    { name: 'David Zhang', type: '图文', symptom: 'Recurrent dizziness', status: '进行中' },
    { name: 'Mary Wang', type: '视频', symptom: 'Fatigue', status: '待接诊' },
    { name: 'Michael Liu', type: '图文', symptom: 'Chest tightness', status: '已完成' },
    { name: 'Jennifer Chen', type: '视频', symptom: 'Cough', status: '已完成' },
  ];
  for (const c of conDef) {
    const created = await api('/consultations', {
      method: 'POST',
      token: t,
      body: { patient_id: pid[c.name], type: c.type, symptom: c.symptom },
    });
    await api(`/consultations/${created.id}`, { method: 'PATCH', token: t, body: { status: c.status } });
    console.log('✓ Consultation', created.consultation_no, c.name, c.status);
  }

  // 6) Remote conferences
  const confDef = [
    { topic: 'David Zhang - Difficult Hypertension Case', name: 'David Zhang', experts: ['Dr. Wang', 'Dr. Zhao'], status: '进行中' },
    { topic: 'Michael Liu - CHD Treatment Plan Discussion', name: 'Michael Liu', experts: ['Dr. Li'], status: '待会诊' },
    { topic: 'Jennifer Chen - COPD Follow-up Assessment', name: 'Jennifer Chen', experts: ['Dr. Zhang', 'Dr. Liu'], status: '已完成' },
  ];
  for (const c of confDef) {
    const created = await api('/conferences', {
      method: 'POST',
      token: t,
      body: { topic: c.topic, patient_id: pid[c.name], experts: c.experts },
    });
    if (c.status !== '待会诊') await api(`/conferences/${created.id}`, { method: 'PATCH', token: t, body: { status: '进行中' } });
    if (c.status === '已完成') await api(`/conferences/${created.id}`, { method: 'PATCH', token: t, body: { status: '已完成', summary: 'Historical demo conference summary' } });
    console.log('✓ Conference', created.conference_no, c.topic);
  }

  // 7) Health management
  const healthDef = [
    { name: 'David Zhang', plan: 'Hypertension Control Plan', metrics: 'Blood pressure 145/92', alert_level: '预警' },
    { name: 'Mary Wang', plan: 'Diabetes Dietary Management', metrics: 'Blood glucose 6.8 mmol/L', alert_level: '正常' },
    { name: 'Michael Liu', plan: 'CHD Rehabilitation Plan', metrics: 'Heart rate 88 bpm', alert_level: '异常' },
    { name: 'Jennifer Chen', plan: 'COPD Breathing Training', metrics: 'SpO2 95%', alert_level: '正常' },
  ];
  for (const h of healthDef) {
    const created = await api('/health', {
      method: 'POST',
      token: t,
      body: { patient_id: pid[h.name], plan: h.plan, metrics: h.metrics, alert_level: h.alert_level },
    });
    console.log('✓ Health plan', h.name, h.alert_level);
  }

  // 8) Doctor community
  const postDef = [
    { circle: 'Cardiology', title: 'Managing a case of refractory hypertension', content: 'Sharing a de-identified case of refractory hypertension and discussing combination therapy options…' },
    { circle: 'Respiratory Medicine', title: 'Key points for COPD acute exacerbation', content: 'A summary of the assessment and management of COPD acute exacerbation based on the latest guidelines…' },
    { circle: 'Endocrinology', title: 'Early recognition of diabetic foot', content: 'How to quickly identify high-risk diabetic foot patients in the clinic (de-identified)…' },
  ];
  for (const s of postDef) {
    await api('/social/posts', { method: 'POST', token: t, body: s });
    console.log('✓ Post', s.title);
  }

  console.log('\nSeed complete ✅');
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
