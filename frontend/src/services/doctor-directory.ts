import api from "./api";
import type { Conference, Paginated, UserProfile } from "./types";
export type DoctorSummary = Pick<
  UserProfile,
  | "id"
  | "username"
  | "real_name"
  | "department"
  | "title"
  | "hospital"
  | "roles"
>;
export interface ConferenceParticipant {
  id: string;
  name: string;
  department: string;
  title: string;
  response: "待响应" | "已接受" | "已拒绝";
  responded_at: string | null;
}
export interface JointConference extends Conference {
  expert_ids: string[];
  participants: ConferenceParticipant[];
  initiator_department: string | null;
  opinions: {
    id: string;
    user_id: string;
    name: string;
    department: string;
    content: string;
    created_at: string;
  }[];
}
export const roleLabels: Record<string, string> = {
  admin: "Administrator",
  doctor: "Doctor",
  senior_doctor: "Senior Doctor",
  consultation_expert: "Consultation Expert",
};
export function doctorRole(roles: string[]) {
  return (
    ["admin", "senior_doctor", "consultation_expert", "doctor"]
      .filter(
        (r) =>
          roles.includes(r) &&
          !(r === "doctor" && roles.includes("senior_doctor")),
      )
      .map((r) => roleLabels[r])
      .join(" / ") || "No role assigned"
  );
}
export const directoryApi = {
  departments: () =>
    api.get<string[]>("/users/departments").then((r) => r.data),
  doctors: (params: Record<string, unknown>) =>
    api
      .get<Paginated<DoctorSummary>>("/users/doctors", { params })
      .then((r) => r.data),
};
export const jointApi = {
  list: (params: Record<string, unknown>) =>
    api
      .get<Paginated<JointConference>>("/conferences", { params })
      .then((r) => r.data),
  detail: (id: string) =>
    api.get<JointConference>("/conferences/" + id).then((r) => r.data),
  create: (data: {
    topic: string;
    patient_id?: string;
    expert_ids: string[];
    summary?: string;
    scheduled_at?: string;
  }) => api.post<JointConference>("/conferences", data).then((r) => r.data),
  update: (id: string, data: Partial<JointConference>) =>
    api.patch<JointConference>("/conferences/" + id, data).then((r) => r.data),
  respond: (id: string, response: "accept" | "decline") =>
    api
      .post<JointConference>("/conferences/" + id + "/respond", { response })
      .then((r) => r.data),
  opinion: (id: string, content: string) =>
    api
      .post<JointConference>("/conferences/" + id + "/opinions", { content })
      .then((r) => r.data),
};
