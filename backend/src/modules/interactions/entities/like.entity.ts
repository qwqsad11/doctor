import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// 通用点赞：同一用户对同一目标只能点赞一次（unique 索引去重）。
@Entity('likes')
@Index(['target_type', 'target_id', 'user_id'], { unique: true })
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  target_type: string; // 'post' | 'consultation'

  @Column('uuid')
  target_id: string;

  @Column('uuid')
  user_id: string;

  @CreateDateColumn()
  created_at: Date;
}
