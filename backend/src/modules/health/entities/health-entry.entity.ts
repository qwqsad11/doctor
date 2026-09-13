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
@Entity("health_entries")
@Index(["plan_id", "kind", "created_at"])
export class HealthEntry {
  @PrimaryGeneratedColumn("uuid") id: string;
  @Column("uuid") plan_id: string;
  @ManyToOne(() => HealthRecord, { onDelete: "CASCADE" })
  @JoinColumn({ name: "plan_id" })
  plan: HealthRecord;
  @Column({ length: 20 }) kind: "measurement" | "assessment" | "notification";
  @Column("jsonb") data: Record<string, any>;
  @Column({ length: 50 }) actor: string;
  @CreateDateColumn() created_at: Date;
}
