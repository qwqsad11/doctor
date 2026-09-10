import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ConferenceStatus = '待会诊' | '进行中' | '已完成';

@Entity('conferences')
@Index(['conference_no'], { unique: true })
export class Conference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  conference_no: string;

  @Column({ length: 200 })
  topic: string;

  @Column('uuid', { nullable: true })
  patient_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  patient_name: string | null;

  @Column('uuid', { nullable: true })
  initiator_id: string | null;

  @Column({ length: 50, nullable: true })
  initiator_name: string;

  @Column({ type: 'simple-array', default: '' })
  experts: string[];

  @Column({ type: 'enum', enum: ['待会诊', '进行中', '已完成'], default: '待会诊' })
  status: ConferenceStatus;

  @Column({ nullable: true })
  scheduled_at: Date;

  @Column('text', { nullable: true })
  summary: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
