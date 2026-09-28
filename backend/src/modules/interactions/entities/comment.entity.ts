import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// 通用评论：通过 target_type + target_id 指向任意可评论对象（帖子 / 会诊）。
@Entity('comments')
@Index(['target_type', 'target_id'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 30 })
  target_type: string; // 'post' | 'consultation'

  @Column('uuid')
  target_id: string;

  @Column('uuid', { nullable: true })
  author_id: string;

  @Column({ length: 100 })
  author_name: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
