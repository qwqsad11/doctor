import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('social_posts')
@Index(['created_at'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { nullable: true })
  author_id: string;

  @Column({ length: 50 })
  author_name: string;

  @Column({ length: 50, nullable: true })
  circle: string;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column('int', { default: 0 })
  likes: number;

  @Column('int', { default: 0 })
  comments: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
