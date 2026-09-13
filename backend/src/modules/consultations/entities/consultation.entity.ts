import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ConsultationType = '图文' | '视频';
export type ConsultationStatus = '待接诊' | '进行中' | '已完成';

@Entity('consultations')
@Index(['consultation_no'], { unique: true })
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  consultation_no: string;

  @Column('uuid')
  patient_id: string;

  @Column({ length: 50 })
  patient_name: string;

  @Column({ type: 'enum', enum: ['图文', '视频'], default: '图文' })
  type: ConsultationType;

  @Column('uuid', { nullable: true })
  doctor_id: string | null;

  @Column({ length: 50, nullable: true })
  doctor_name: string;

  @Column({ type: 'enum', enum: ['待接诊', '进行中', '已完成'], default: '待接诊' })
  status: ConsultationStatus;

  @Column('text', { nullable: true })
  symptom: string;

  @Column('text', { nullable: true })
  advice: string;

  @Column('text', { nullable: true })
  attachments: string;

  @Column('text', { nullable: true })
  video_recording: string;

  @Column({ nullable: true })
  started_at: Date;

  @Column({ nullable: true })
  ended_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
