import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { HealthRecord } from "./health-record.entity";
@Entity("health_reminders")
@Index(["enabled", "next_run_at"])
export class HealthReminder {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") plan_id: string;
  @ManyToOne(() => HealthRecord, { onDelete: "CASCADE" })
  @JoinColumn({ name: "plan_id" })
  plan: HealthRecord;
  @Column({ length: 500 }) message: string;
  @Column("timestamptz") next_run_at: Date;
  @Column("int", { default: 0 }) interval_days: number;
  @Column({ default: true }) enabled: boolean;
  @Column("timestamptz", { nullable: true }) last_sent_at: Date | null;
  @CreateDateColumn() created_at: Date;
}
