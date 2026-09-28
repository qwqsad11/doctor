import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Like } from './entities/like.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Like)
    private likesRepository: Repository<Like>,
  ) {}

  async listComments(targetType: string, targetId: string) {
    const [list, total] = await this.commentsRepository.findAndCount({
      where: { target_type: targetType, target_id: targetId },
      order: { created_at: 'ASC' },
    });
    return { list, total };
  }

  async addComment(
    targetType: string,
    targetId: string,
    content: string,
    user: CurrentUserPayload,
  ) {
    const comment = this.commentsRepository.create({
      target_type: targetType,
      target_id: targetId,
      author_id: user.userId,
      author_name: user.username,
      content,
    });
    return this.commentsRepository.save(comment);
  }

  async removeComment(targetType: string, targetId: string, commentId: string) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, target_type: targetType, target_id: targetId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.commentsRepository.remove(comment);
    return { message: 'Comment deleted' };
  }

  async countComments(targetType: string, targetId: string) {
    return this.commentsRepository.count({
      where: { target_type: targetType, target_id: targetId },
    });
  }

  async countLikes(targetType: string, targetId: string) {
    return this.likesRepository.count({
      where: { target_type: targetType, target_id: targetId },
    });
  }

  async hasLiked(targetType: string, targetId: string, userId: string) {
    return !!(await this.likesRepository.findOne({
      where: { target_type: targetType, target_id: targetId, user_id: userId },
    }));
  }

  async addLike(targetType: string, targetId: string, userId: string) {
    const existing = await this.likesRepository.findOne({
      where: { target_type: targetType, target_id: targetId, user_id: userId },
    });
    if (existing) return;
    await this.likesRepository.save(
      this.likesRepository.create({
        target_type: targetType,
        target_id: targetId,
        user_id: userId,
      }),
    );
  }

  async removeLike(targetType: string, targetId: string, userId: string) {
    const existing = await this.likesRepository.findOne({
      where: { target_type: targetType, target_id: targetId, user_id: userId },
    });
    if (existing) await this.likesRepository.remove(existing);
  }
}
