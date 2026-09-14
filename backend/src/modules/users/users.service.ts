import { PROFESSIONAL_TITLE_LABELS } from "./departments";
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./entities/user.entity";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { sanitizeUser } from "../../common/utils/sanitize-user";
import { TempPermission } from "./entities/temp-permission.entity";
import { AuditService } from "../audit/audit.service";
import { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { QueryDoctorsDto } from "./dto/query-doctors.dto";
import { DEPARTMENTS } from "./departments";
import { SetUserRolesDto } from "./dto/set-user-roles.dto";
import { CreateTempPermissionDto } from "./dto/create-temp-permission.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(TempPermission)
    private tempPermissionsRepository: Repository<TempPermission>,
    private auditService: AuditService,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
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
        throw new ConflictException("This email address is already in use");
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
    if (!ok) throw new BadRequestException("Current password is incorrect");

    const hash = await bcrypt.hash(dto.new_password, 10);
    await this.usersRepository.update(userId, { password_hash: hash });
    return { message: "Password changed successfully" };
  }

  /** 更新头像地址 */
  async updateAvatar(userId: string, avatar: string) {
    await this.usersRepository.update(userId, { avatar });
    return this.getProfile(userId);
  }

  async departments() {
    const rows = await this.usersRepository
      .createQueryBuilder("u")
      .select("DISTINCT u.department", "department")
      .where(
        "u.status = 'active' AND u.department IS NOT NULL AND u.department <> ''",
      )
      .getRawMany<{ department: string }>();
    return [...new Set([...DEPARTMENTS, ...rows.map((r) => r.department)])];
  }

  async doctors(query: QueryDoctorsDto, excludeId: string) {
    const { page = 1, pageSize = 10, department, keyword } = query;
    const qb = this.usersRepository
      .createQueryBuilder("u")
      .select([
        "u.id",
        "u.username",
        "u.real_name",
        "u.department",
        "u.title",
        "u.hospital",
        "u.roles",
      ])
      .where(
        "u.status = 'active' AND u.roles ~ '(^|,)(doctor|senior_doctor|consultation_expert)(,|$)'",
      )
      .andWhere("u.id <> :id", { id: excludeId });
    if (department) qb.andWhere("u.department = :department", { department });
    if (keyword) {
      const titles = Object.entries(PROFESSIONAL_TITLE_LABELS)
        .filter(([, label]) => label.toLowerCase().includes(keyword.trim().toLowerCase()))
        .map(([value]) => value);
      qb.andWhere(
        "(u.real_name ILIKE :kw OR u.username ILIKE :kw OR u.title ILIKE :kw" +
          (titles.length ? " OR u.title IN (:...titles))" : ")"),
        { kw: "%" + keyword + "%", ...(titles.length ? { titles } : {}) },
      );
    }
    const [list, total] = await qb
      .orderBy("u.department", "ASC")
      .addOrderBy("u.username", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return { list, total, page, pageSize };
  }

  async listUsers() {
    return (
      await this.usersRepository.find({ order: { username: "ASC" } })
    ).map(sanitizeUser);
  }

  async setRoles(id: string, dto: SetUserRolesDto, actor: CurrentUserPayload) {
    const user = await this.findById(id);
    if (user.id === actor.userId && !dto.roles.includes("admin")) {
      throw new BadRequestException("You cannot remove your own administrator role");
    }
    user.roles = dto.roles;
    await this.usersRepository.save(user);
    await this.auditService.record(
      actor,
      "Update user roles",
      `${user.username}: ${dto.roles.join(",")}`,
    );
    return sanitizeUser(user);
  }

  async listTempPermissions() {
    await this.revokeExpiredPermissions();
    return this.tempPermissionsRepository.find({
      where: { revokedAt: IsNull() },
      order: { expiresAt: "ASC" },
    });
  }

  async createTempPermission(
    dto: CreateTempPermissionDto,
    actor: CurrentUserPayload,
  ) {
    await this.revokeExpiredPermissions();
    if (new Date(dto.expiresAt) <= new Date())
      throw new BadRequestException("Expiry time must be in the future");
    const user = await this.findById(dto.userId);
    const permission = await this.tempPermissionsRepository.save(
      this.tempPermissionsRepository.create({
        ...dto,
        expiresAt: new Date(dto.expiresAt),
        reason: dto.reason ?? null,
      }),
    );
    await this.auditService.record(
      actor,
      "Grant temporary permission",
      `${user.username}: ${dto.resourceType}/${dto.resourceId}`,
    );
    return permission;
  }

  async revokeTempPermission(
    id: string,
    actor: CurrentUserPayload,
    automatic = false,
  ) {
    const permission = await this.tempPermissionsRepository.findOne({
      where: { id },
    });
    if (!permission || permission.revokedAt)
      throw new NotFoundException("Temporary permission not found or already revoked");
    permission.revokedAt = new Date();
    await this.tempPermissionsRepository.save(permission);
    await this.auditService.record(
      actor,
      automatic ? "Automatically revoke temporary permission" : "Revoke temporary permission",
      `${permission.resourceType}/${permission.resourceId}`,
    );
  }

  async canViewConsultation(userId: string, consultationId: string) {
    await this.revokeExpiredPermissions();
    return !!(await this.tempPermissionsRepository.findOne({
      where: {
        userId,
        resourceType: "consultation",
        resourceId: consultationId,
        permissionType: "view",
        revokedAt: IsNull(),
      },
    }));
  }

  async revokeConsultationPermissions(
    consultationId: string,
    actor: CurrentUserPayload,
  ) {
    const active = await this.tempPermissionsRepository.find({
      where: {
        resourceType: "consultation",
        resourceId: consultationId,
        revokedAt: IsNull(),
      },
    });
    await Promise.all(
      active.map((permission) =>
        this.revokeTempPermission(permission.id, actor, true),
      ),
    );
  }

  private async revokeExpiredPermissions() {
    const expired = await this.tempPermissionsRepository
      .createQueryBuilder("p")
      .where("p.revokedAt IS NULL AND p.expiresAt <= :now", { now: new Date() })
      .getMany();
    const system: CurrentUserPayload = {
      userId: "system",
      username: "system",
      email: "system@local",
      roles: [],
    };
    await Promise.all(
      expired.map((permission) =>
        this.revokeTempPermission(permission.id, system, true),
      ),
    );
  }
}
