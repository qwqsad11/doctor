import { User } from '../../modules/users/entities/user.entity';

/**
 * 去除敏感字段（password_hash / face_model），返回可安全返回前端的用户信息。
 * 供登录响应、个人档案查询/更新统一复用。
 */
export function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone ?? null,
    real_name: user.real_name ?? null,
    gender: user.gender ?? null,
    department: user.department ?? null,
    title: user.title ?? null,
    hospital: user.hospital ?? null,
    bio: user.bio ?? null,
    avatar: user.avatar ?? null,
    roles: user.roles,
    status: user.status,
  };
}
