import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('temp_permissions')
@Unique(['userId', 'resourceType', 'resourceId', 'expiresAt'])
export class TempPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ length: 50 })
  resourceId: string;

  @Column({ length: 50 })
  resourceType: string; // consultation

  @Column({ length: 50 })
  permissionType: string; // view, edit

  @CreateDateColumn()
  grantedAt: Date;

  @Column()
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  reason: string | null;

  @Column({ default: true })
  auto_revoke: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;
}
