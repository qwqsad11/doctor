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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
