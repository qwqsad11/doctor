import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type PatientGender = '男' | '女';
export type PatientStatus = '在管' | '待随访' | '已转出';

@Entity('patients')
@Index(['patient_no'], { unique: true })
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  patient_no: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'enum', enum: ['男', '女'], default: '男' })
  gender: PatientGender;

  @Column('int')
  age: number;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ name: 'patient_group', length: 50, nullable: true })
  group: string;

  @Column('text', { nullable: true })
  symptom: string;

  @Column({ type: 'enum', enum: ['在管', '待随访', '已转出'], default: '在管' })
  status: PatientStatus;

  @Column('uuid', { nullable: true })
  doctor_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
