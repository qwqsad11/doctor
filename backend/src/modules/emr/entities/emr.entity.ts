import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
export type EmrType = "门诊病历" | "住院病历" | "体检报告";
export type EmrStatus = "草稿" | "待审核" | "已审核" | "已归档" | "已退回";
export interface MedicalOrder {
  id: string;
  category: "药物" | "检查" | "检验";
  name: string;
  instruction: string;
  status: "执行中" | "已停止";
  created_at: string;
  updated_at: string;
  history: { action: string; actor: string; at: string; detail: string }[];
}
export interface ReviewEvent {
  action: string;
  actor: string;
  actor_id: string;
  at: string;
  comment: string;
}
@Entity("emr_records")
@Index(["emr_no"], { unique: true })
export class Emr {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column({ length: 30 }) emr_no: string;
  @Column("uuid") patient_id: string;
  @Column({ length: 50 }) patient_name: string;
  @Column({
    type: "enum",
    enum: ["门诊病历", "住院病历", "体检报告"],
    default: "门诊病历",
  })
  type: EmrType;
  @Column("uuid", { nullable: true }) doctor_id: string | null;
  @Column({ length: 50, nullable: true }) doctor_name: string;
  @Column({
    type: "enum",
    enum: ["草稿", "待审核", "已审核", "已归档", "已退回"],
    default: "草稿",
  })
  status: EmrStatus;
  @Column("text", { nullable: true }) diagnosis: string;
  @Column("text", { nullable: true }) content: string;
  @Column({ length: 30, nullable: true }) template_id: string;
  @Column("jsonb", { default: {} }) structured_content: Record<string, string>;
  @Column("jsonb", { default: [] }) orders: MedicalOrder[];
  @Column("uuid", { nullable: true }) reviewer_id: string | null;
  @Column({ type: "varchar", length: 50, nullable: true }) reviewer_name:
    string | null;
  @Column("jsonb", { default: [] }) review_history: ReviewEvent[];
  @Column("timestamptz", { nullable: true }) archived_at: Date | null;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
