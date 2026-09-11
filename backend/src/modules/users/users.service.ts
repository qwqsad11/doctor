import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { sanitizeUser } from '../../common/utils/sanitize-user';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  /** 获取当前用户档案（不含敏感字段） */
  async getProfile(userId: string) {
    return sanitizeUser(await this.findById(userId));
  }

  /** 更新当前用户档案（仅更新传入的非空字段） */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('该邮箱已被占用');
      }
    }

    // 只保留已填写的字段，避免 undefined 覆盖
    const updates = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    ) as Partial<User>;

    await this.usersRepository.update(userId, updates);
    return this.getProfile(userId);
  }

  /** 修改密码（校验旧密码） */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findById(userId);
    const ok = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!ok) throw new BadRequestException('当前密码不正确');

    const hash = await bcrypt.hash(dto.new_password, 10);
    await this.usersRepository.update(userId, { password_hash: hash });
    return { message: '密码修改成功' };
  }

  /** 更新头像地址 */
  async updateAvatar(userId: string, avatar: string) {
    await this.usersRepository.update(userId, { avatar });
    return this.getProfile(userId);
  }
}
