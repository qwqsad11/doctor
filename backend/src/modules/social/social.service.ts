import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
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

  async findOne(id: string) {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException("Post not found");
    return post;
  }

  async update(id: string, dto: UpdatePostDto) {
    const post = await this.findOne(id);
    Object.assign(post, dto);
    return this.postsRepository.save(post);
  }

  async like(id: string) {
    const post = await this.findOne(id);
    post.likes += 1;
    return this.postsRepository.save(post);
  }

  async remove(id: string) {
    const post = await this.findOne(id);
    await this.postsRepository.remove(post);
    return { message: "Deleted successfully" };
  }
}
