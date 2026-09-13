import api from "./api";
import type { Emr, HealthRecord } from "./types";
export interface EmrTemplate {
  id: string;
  name: string;
  type: Emr["type"];
  fields: string[];
}
export interface OrderInput {
  category: "药物" | "检查" | "检验";
  name: string;
  instruction: string;
}
export interface MedicalOrder extends OrderInput {
  id: string;
  status: "执行中" | "已停止";
  created_at: string;
  updated_at: string;
  history: { action: string; actor: string; at: string; detail: string }[];
}
export interface EmrDetail extends Emr {
  template_id: string;
  structured_content: Record<string, string>;
  orders: MedicalOrder[];
  reviewer_id: string | null;
  reviewer_name: string | null;
  archived_at: string | null;
  review_history: {
    action: string;
    actor: string;
    actor_id: string;
    at: string;
    comment: string;
  }[];
}
export interface Measurement {
  kind: "血压" | "血糖";
  measured_at: string;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  context?: string;
  source?: string;
  note?: string;
}
export interface Assessment {
  conclusion: string;
  advice: string;
  alert_level: HealthRecord["alert_level"];
  next_assessment_at: string;
  revised_plan?: string;
  previous_plan?: string;
}
export interface HealthEntry {
  id: string;
  kind: "measurement" | "assessment" | "notification";
  actor?: string;
  data: Partial<Measurement & Assessment> & {
    message?: string;
    scheduled_at?: string;
  };
  created_at: string;
}
export interface Reminder {
  id: string;
  message: string;
  next_run_at: string;
  interval_days: number;
  enabled: boolean;
  last_sent_at: string | null;
}
export interface HealthDetail extends HealthRecord {
  goals?: string;
  guidance?: string;
  next_assessment_at: string | null;
  patient_access_expires_at: string | null;
  entries: HealthEntry[];
  reminders: Reminder[];
}
export interface PatientHealth {
  patient_name: string;
  plan: string;
  goals: string;
  guidance: string;
  next_assessment_at: string | null;
  entries: HealthEntry[];
}
export const emrWorkflow = {
  templates: () => api.get<EmrTemplate[]>("/emr/templates").then((r) => r.data),
  reviewers: () =>
    api
      .get<{ id: string; name: string; department: string | null }[]>(
        "/emr/reviewers",
      )
      .then((r) => r.data),
  detail: (id: string) => api.get<EmrDetail>("/emr/" + id).then((r) => r.data),
  save: (id: string | undefined, data: Partial<EmrDetail>) =>
    (id
      ? api.patch<EmrDetail>("/emr/" + id, data)
      : api.post<EmrDetail>("/emr", data)
    ).then((r) => r.data),
  submit: (id: string, reviewer_id: string) =>
    api
      .post<EmrDetail>("/emr/" + id + "/submit", { reviewer_id })
      .then((r) => r.data),
  review: (
    id: string,
    data: { decision: "approve" | "reject"; comment: string },
  ) => api.post<EmrDetail>("/emr/" + id + "/review", data).then((r) => r.data),
  archive: (id: string) =>
    api.post<EmrDetail>("/emr/" + id + "/archive").then((r) => r.data),
  order: (id: string, data: OrderInput, orderId?: string) =>
    (orderId
      ? api.patch<EmrDetail>("/emr/" + id + "/orders/" + orderId, data)
      : api.post<EmrDetail>("/emr/" + id + "/orders", data)
    ).then((r) => r.data),
  stop: (id: string, orderId: string, reason: string) =>
    api
      .post<EmrDetail>("/emr/" + id + "/orders/" + orderId + "/stop", {
        reason,
      })
      .then((r) => r.data),
};
export const healthWorkflow = {
  detail: (id: string) =>
    api.get<HealthDetail>("/health/" + id).then((r) => r.data),
  measurement: (id: string, data: Measurement) =>
    api.post("/health/" + id + "/measurements", data),
  reminder: (
    id: string,
    data: Omit<Reminder, "id" | "enabled" | "last_sent_at">,
  ) => api.post("/health/" + id + "/reminders", data),
  cancelReminder: (id: string, rid: string) =>
    api.delete("/health/" + id + "/reminders/" + rid),
  assessment: (id: string, data: Assessment) =>
    api.post("/health/" + id + "/assessments", data),
  access: (id: string) =>
    api
      .post<{ token: string; expires_at: string }>(
        "/health/" + id + "/patient-access",
      )
      .then((r) => r.data),
  revoke: (id: string) => api.delete("/health/" + id + "/patient-access"),
};
// Patient bearer tokens are sent in a header, never in API URLs or doctor authentication storage.
export async function patientRequest<T>(
  token: string,
  data?: Measurement,
): Promise<T> {
  const base =
    import.meta.env.VITE_APP_API_URL || "http://localhost:3001/api/v1";
  const response = await fetch(
    base + "/health/patient-portal" + (data ? "/measurements" : ""),
    {
      method: data ? "POST" : "GET",
      headers: {
        "x-patient-token": token,
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(body.message)
        ? body.message.join("；")
        : body.message || "请求失败",
    );
  return body as T;
}
export function errorMessage(e: unknown) {
  const error = e as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const value = error.response?.data?.message || error.message || "操作失败";
  return Array.isArray(value) ? value.join("；") : value;
}
