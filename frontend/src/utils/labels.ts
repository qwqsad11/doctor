const labels: Record<string, string> = {
  '男': 'Male', '女': 'Female',
  '在管': 'Active', '待随访': 'Follow-up Due', '已转出': 'Transferred',
  '门诊病历': 'Outpatient Record', '住院病历': 'Inpatient Record', '体检报告': 'Physical Examination Report',
  '草稿': 'Draft', '待审核': 'Pending Review', '已归档': 'Archived', '已退回': 'Returned',
  '图文': 'Text and Image', '视频': 'Video',
  '待接诊': 'Awaiting Consultation', '进行中': 'In Progress', '已完成': 'Completed', '待会诊': 'Awaiting Conference',
  '正常': 'Normal', '预警': 'Warning', '异常': 'Abnormal',
  '成功': 'Success', '失败': 'Failed',
  '高血压': 'Hypertension', '糖尿病': 'Diabetes', '冠心病': 'Coronary Heart Disease', '慢阻肺': 'Chronic Obstructive Pulmonary Disease', '其它': 'Other',
  'admin': 'Administrator', 'doctor': 'Doctor', 'senior_doctor': 'Senior Doctor', 'consultation_expert': 'Consultation Expert',
};

export const displayLabel = (value: string | null | undefined) => value ? labels[value] || value : '-';
