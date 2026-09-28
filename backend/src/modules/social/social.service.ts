import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { InteractionsService } from '../interactions/interactions.service';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    private interactionsService: InteractionsService,
  ) {}

  async create(dto: CreatePostDto, user: CurrentUserPayload) {
    const post = this.postsRepository.create({
      ...dto,
      author_id: user.userId,
      author_name: user.username,
    });
    return this.postsRepository.save(post);
  }

  async findAll(query: QueryPostDto) {
    const { page = 1, pageSize = 10, keyword, circle } = query;
    const qb = this.postsRepository.createQueryBuilder('p');

    if (circle) qb.andWhere('p.circle = :circle', { circle });
    if (keyword) {
      qb.andWhere('(p.title ILIKE :kw OR p.content ILIKE :kw)', {
        kw: `%${keyword}%`,
      });
    }

    const [list, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { list, total, page, pageSize };
  }

  async findOne(id: string, user?: CurrentUserPayload) {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException("Post not found");
    if (!user) return post;
    const liked = await this.interactionsService.hasLiked('post', id, user.userId);
    return { ...post, liked };
  }

  async update(id: string, dto: UpdatePostDto) {
    const post = await this.findOne(id);
    Object.assign(post, dto);
    return this.postsRepository.save(post);
  }

  async like(id: string, user: CurrentUserPayload) {
    const post = await this.findOne(id);
    const wasLiked = await this.interactionsService.hasLiked('post', id, user.userId);
    if (wasLiked) {
      await this.interactionsService.removeLike('post', id, user.userId);
    } else {
      await this.interactionsService.addLike('post', id, user.userId);
    }
    post.likes = await this.interactionsService.countLikes('post', id);
    await this.postsRepository.save(post);
    return { likes: post.likes, liked: !wasLiked };
  }

  async listComments(id: string) {
    await this.findOne(id);
    return this.interactionsService.listComments('post', id);
  }

  async addComment(id: string, content: string, user: CurrentUserPayload) {
    await this.findOne(id);
    const comment = await this.interactionsService.addComment('post', id, content, user);
    const post = await this.findOne(id);
    post.comments = await this.interactionsService.countComments('post', id);
    await this.postsRepository.save(post);
    return comment;
  }

  async removeComment(id: string, commentId: string) {
    await this.findOne(id);
    const result = await this.interactionsService.removeComment('post', id, commentId);
    const post = await this.findOne(id);
    post.comments = await this.interactionsService.countComments('post', id);
    await this.postsRepository.save(post);
    return result;
  }

  async remove(id: string) {
    const post = await this.findOne(id);
    await this.postsRepository.remove(post);
    return { message: "Deleted successfully" };
  }
}
