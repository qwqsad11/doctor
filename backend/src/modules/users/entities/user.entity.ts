import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  username: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255 })
  password_hash: string;

  @Column({ type: 'bytea', nullable: true })
  face_model: Buffer;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'locked'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'locked';

  @Column({ nullable: true })
  last_login: Date;

  @Column({ type: 'simple-array', default: '' })
  roles: string[];

  // ===== 个人档案字段 =====
  @Column({ type: 'varchar', length: 50, nullable: true })
  real_name: string | null;

  @Column({ type: 'enum', enum: ['男', '女'], nullable: true })
  gender: '男' | '女' | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  title: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  hospital: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
