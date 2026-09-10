import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前登录用户载荷（由 JwtStrategy.validate 注入到 request.user）
 */
export interface CurrentUserPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
}

/**
 * 从请求中取出当前登录用户，可传入字段名取出单个字段
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserPayload = request.user;
    return data ? user?.[data] : user;
  },
);
