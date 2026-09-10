import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './user.entity';

@Entity('temp_permissions')
@Unique(['userId', 'resourceType', 'resourceId', 'expiresAt'])
export class TempPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  resourceId: number;

  @Column({ length: 50 })
  resourceType: string; // patient, emr, conference

  @Column({ length: 50 })
  permissionType: string; // view, edit

  @CreateDateColumn()
  grantedAt: Date;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: true })
  auto_revoke: boolean;

  @Column({ nullable: true })
  revokedAt: Date;
}
