/**
 * 演示数据播种脚本（幂等，通过后端 API 写入，走真实业务逻辑 + 审计）
 * 用法：先启动后端，再 `node scripts/seed-demo-data.js [PORT]`
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
    body: { username: 'admin', password: 'admin123' },
  });

  // 1) 清理冒烟测试残留的「测试患者」
  const leftovers = await api('/patients?keyword=测试患者&pageSize=100', { token: t });
  for (const p of leftovers.list) {
    await api(`/patients/${p.id}`, { method: 'DELETE', token: t });
  }

  // 2) 幂等：已存在演示数据则跳过
  const existing = await api('/patients?keyword=张伟', { token: t });
  if (existing.total > 0) {
    console.log('演示数据已存在，跳过播种');
    return;
  }

  // 3) 患者
  const patientsDef = [
    { name: '张伟', gender: '男', age: 58, phone: '13800002211', group: '高血压', symptom: '头晕', status: '在管' },
    { name: '王芳', gender: '女', age: 46, phone: '13900008820', group: '糖尿病', symptom: '乏力', status: '在管' },
    { name: '刘强', gender: '男', age: 63, phone: '13700006645', group: '冠心病', symptom: '胸闷', status: '待随访' },
    { name: '陈静', gender: '女', age: 39, phone: '13600001102', group: '慢阻肺', symptom: '咳嗽', status: '在管' },
    { name: '赵磊', gender: '男', age: 71, phone: '13500009901', group: '高血压', symptom: '心悸', status: '已转出' },
  ];
  const pid = {};
  for (const p of patientsDef) {
    const { status, ...body } = p;
    const created = await api('/patients', { method: 'POST', token: t, body });
    pid[p.name] = created.id;
    if (status !== '在管') {
      await api(`/patients/${created.id}`, { method: 'PATCH', token: t, body: { status } });
    }
    console.log('✓ 患者', created.patient_no, p.name);
  }

  // 4) 电子病历
  const emrDef = [
    { name: '张伟', type: '门诊病历', diagnosis: '高血压 2 级', status: '待审核' },
    { name: '王芳', type: '住院病历', diagnosis: '2 型糖尿病', status: '已归档' },
    { name: '刘强', type: '门诊病历', diagnosis: '冠心病', status: '草稿' },
    { name: '陈静', type: '体检报告', diagnosis: '慢阻肺', status: '已退回' },
  ];
  for (const e of emrDef) {
    const created = await api('/emr', {
      method: 'POST',
      token: t,
      body: { patient_id: pid[e.name], type: e.type, diagnosis: e.diagnosis },
    });
    await api(`/emr/${created.id}`, { method: 'PATCH', token: t, body: { status: e.status } });
    console.log('✓ 病历', created.emr_no, e.name, e.status);
  }

  // 5) 在线问诊
  const conDef = [
    { name: '张伟', type: '图文', symptom: '反复头晕', status: '进行中' },
    { name: '王芳', type: '视频', symptom: '乏力', status: '待接诊' },
    { name: '刘强', type: '图文', symptom: '胸闷', status: '已完成' },
    { name: '陈静', type: '视频', symptom: '咳嗽', status: '已完成' },
  ];
  for (const c of conDef) {
    const created = await api('/consultations', {
      method: 'POST',
      token: t,
      body: { patient_id: pid[c.name], type: c.type, symptom: c.symptom },
    });
    await api(`/consultations/${created.id}`, { method: 'PATCH', token: t, body: { status: c.status } });
    console.log('✓ 问诊', created.consultation_no, c.name, c.status);
  }

  // 6) 远程会诊
  const confDef = [
    { topic: '张伟高血压疑难病例会诊', name: '张伟', experts: ['王主任', '赵教授'], status: '进行中' },
    { topic: '刘强冠心病方案讨论', name: '刘强', experts: ['李主任'], status: '待会诊' },
    { topic: '陈静慢阻肺复诊评估', name: '陈静', experts: ['张主任', '刘教授'], status: '已完成' },
  ];
  for (const c of confDef) {
    const created = await api('/conferences', {
      method: 'POST',
      token: t,
      body: { topic: c.topic, patient_id: pid[c.name], experts: c.experts },
    });
    await api(`/conferences/${created.id}`, { method: 'PATCH', token: t, body: { status: c.status } });
    console.log('✓ 会诊', created.conference_no, c.topic);
  }

  // 7) 健康管理
  const healthDef = [
    { name: '张伟', plan: '高血压控制计划', metrics: '血压 145/92', alert_level: '预警' },
    { name: '王芳', plan: '糖尿病饮食管理', metrics: '血糖 6.8 mmol/L', alert_level: '正常' },
    { name: '刘强', plan: '冠心病康复计划', metrics: '心率 88 bpm', alert_level: '异常' },
    { name: '陈静', plan: '慢阻肺呼吸训练', metrics: '血氧 95%', alert_level: '正常' },
  ];
  for (const h of healthDef) {
    const created = await api('/health', {
      method: 'POST',
      token: t,
      body: { patient_id: pid[h.name], plan: h.plan, metrics: h.metrics, alert_level: h.alert_level },
    });
    console.log('✓ 健康计划', h.name, h.alert_level);
  }

  // 8) 医生社交
  const postDef = [
    { circle: '心血管内科', title: '一例难治性高血压的诊疗思路', content: '分享一例经过脱敏处理的难治性高血压病例，探讨联合用药方案……' },
    { circle: '呼吸内科', title: '慢阻肺急性加重期的处理要点', content: '结合最新指南，整理慢阻肺急性加重期的评估与处理流程……' },
    { circle: '内分泌科', title: '糖尿病足早期识别经验分享', content: '门诊中如何快速识别糖尿病足高危患者（已脱敏）……' },
  ];
  for (const s of postDef) {
    await api('/social/posts', { method: 'POST', token: t, body: s });
    console.log('✓ 帖子', s.title);
  }

  console.log('\n播种完成 ✅');
}

main().catch((e) => {
  console.error('播种失败:', e.message);
  process.exit(1);
});
