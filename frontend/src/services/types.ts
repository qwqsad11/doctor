// 与后端实体字段保持一致的共享类型

export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageParams {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  real_name: string | null;
  gender: '男' | '女' | null;
  department: string | null;
  title: string | null;
  hospital: string | null;
  bio: string | null;
  avatar: string | null;
  roles: string[];
  status: string;
}

export interface Patient {
  id: string; // uuid
  patient_no: string;
  name: string;
  gender: '男' | '女';
  age: number;
  phone: string | null;
  group: string | null;
  symptom: string | null;
  status: '在管' | '待随访' | '已转出';
  doctor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Emr {
  id: string;
  emr_no: string;
  patient_id: string;
  patient_name: string;
  type: '门诊病历' | '住院病历' | '体检报告';
  doctor_id: string | null;
  doctor_name: string | null;
  status: '草稿' | '待审核' | '已归档' | '已退回';
  diagnosis: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  consultation_no: string;
  patient_id: string;
  patient_name: string;
  type: '图文' | '视频';
  doctor_id: string | null;
  doctor_name: string | null;
  status: '待接诊' | '进行中' | '已完成';
  symptom: string | null;
  advice: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conference {
  id: string;
  conference_no: string;
  topic: string;
  patient_id: string | null;
  patient_name: string | null;
  initiator_id: string | null;
  initiator_name: string | null;
  experts: string[];
  status: '待会诊' | '进行中' | '已完成';
  scheduled_at: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  plan: string;
  metrics: string | null;
  alert_level: '正常' | '预警' | '异常';
  doctor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPost {
  id: string;
  author_id: string | null;
  author_name: string;
  circle: string | null;
  title: string;
  content: string;
  likes: number;
  comments: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  operator: string | null;
  operator_id: string | null;
  action: string;
  target: string | null;
  result: '成功' | '失败';
  ip: string | null;
  created_at: string;
}
