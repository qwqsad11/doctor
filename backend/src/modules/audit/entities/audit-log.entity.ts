import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AuditResult = '成功' | '失败';

/**
 * 操作审计日志
 */
@Entity('audit_logs')
@Index(['operator_id'])
@Index(['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, nullable: true })
  operator: string;

  @Column('uuid', { nullable: true })
  operator_id: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 200, nullable: true })
  target: string;

  @Column({ type: 'enum', enum: ['成功', '失败'], default: '成功' })
  result: AuditResult;

  @Column({ length: 50, nullable: true })
  ip: string;

  @CreateDateColumn()
  created_at: Date;
}
