import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('permissions')
@Index(['resource', 'action'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  resource: string; // patient, emr, consultation

  @Column({ length: 50 })
  action: string; // view, create, edit, approve

  @Column('text', { nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
