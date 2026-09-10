import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const jwtConfig = (
  configService: ConfigService,
): JwtModuleOptions => ({
  secret: configService.get('JWT_SECRET', 'your-secret-key-change-in-production'),
  signOptions: {
    expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
  },
});
