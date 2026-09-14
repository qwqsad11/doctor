import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { sanitizeUser } from '../../common/utils/sanitize-user';

@Injectable()
export class AuthService {
  // Course-demo only: codes are kept in process memory and never sent externally.
  private readonly pendingMfa = new Map<string, { factor: string; expiresAt: number }>();
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * 校验用户名密码，成功返回用户（不含密码），失败返回 null
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { username } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * 登录：校验凭证 → 签发 JWT → 更新最后登录时间
   */
  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException("Incorrect username or password");
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException("This account cannot sign in");
    }

    const key = `${user.id}:${dto.factor || 'none'}`;
    if (!dto.factor || !dto.verification_code) {
      return {
        mfa_required: true,
        factors: ['sms', 'email', 'face'],
        demo_note: "The demo does not send text messages or emails. Choose a method and enter the demo code.",
      };
    }
    const expected = dto.factor === 'face' ? 'FACE-DEMO' : '123456';
    const pending = this.pendingMfa.get(key);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingMfa.set(key, { factor: dto.factor, expiresAt: Date.now() + 5 * 60_000 });
    }
    if (dto.verification_code !== expected) {
      throw new UnauthorizedException("Incorrect demo verification code or face passphrase");
    }
    this.pendingMfa.delete(key);

    await this.usersRepository.update(user.id, { last_login: new Date() });

    return this.generateToken(user);
  }

  /**
   * 注册：校验唯一性 → 加密密码 → 创建用户（默认 doctor 角色）→ 自动登录
   */
  async register(dto: RegisterDto) {
    const { username, email, password, phone, real_name } = dto;

    const byUsername = await this.usersRepository.findOne({ where: { username } });
    if (byUsername) throw new ConflictException("Username already exists");

    const byEmail = await this.usersRepository.findOne({ where: { email } });
    if (byEmail) throw new ConflictException("Email address already registered");

    const password_hash = await this.hashPassword(password);
    const user = this.usersRepository.create({
      username,
      email,
      password_hash,
      roles: ['doctor'],
      status: 'active',
      ...(phone ? { phone } : {}),
      ...(real_name ? { real_name } : {}),
    });
    await this.usersRepository.save(user);

    return this.generateToken(user);
  }

  /**
   * 生成JWT Token
   */
  async generateToken(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: sanitizeUser(user),
    };
  }

  /**
   * 密码加密
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * 验证密码
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 验证JWT Token
   */
  validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
