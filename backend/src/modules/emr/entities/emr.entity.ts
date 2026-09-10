import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EmrType = '门诊病历' | '住院病历' | '体检报告';
export type EmrStatus = '草稿' | '待审核' | '已归档' | '已退回';

@Entity('emr_records')
@Index(['emr_no'], { unique: true })
export class Emr {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  emr_no: string;

  @Column('uuid')
  patient_id: string;

  @Column({ length: 50 })
  patient_name: string;

  @Column({ type: 'enum', enum: ['门诊病历', '住院病历', '体检报告'], default: '门诊病历' })
  type: EmrType;

  @Column('uuid', { nullable: true })
  doctor_id: string | null;

  @Column({ length: 50, nullable: true })
  doctor_name: string;

  @Column({ type: 'enum', enum: ['草稿', '待审核', '已归档', '已退回'], default: '草稿' })
  status: EmrStatus;

  @Column('text', { nullable: true })
  diagnosis: string;

  @Column('text', { nullable: true })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
