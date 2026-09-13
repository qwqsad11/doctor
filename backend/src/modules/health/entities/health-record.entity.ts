import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type AlertLevel = '正常' | '预警' | '异常';

@Entity('health_records')
@Index(['patient_id'])
export class HealthRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  patient_id: string;

  @Column({ length: 50 })
  patient_name: string;

  @Column({ length: 200 })
  plan: string;

  @Column({ length: 200, nullable: true })
  metrics: string;

  @Column({ length: 100, nullable: true })
  device_source: string;

  @Column({ length: 200, nullable: true })
  reminder: string;

  @Column({ type: 'enum', enum: ['正常', '预警', '异常'], default: '正常' })
  alert_level: AlertLevel;

  @Column('uuid', { nullable: true })
  doctor_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
