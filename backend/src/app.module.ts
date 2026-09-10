import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { EmrModule } from './modules/emr/emr.module';
import { ConferencesModule } from './modules/conferences/conferences.module';
import { HealthModule } from './modules/health/health.module';
import { SocialModule } from './modules/social/social.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

// Config
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';

@Module({
  imports: [
    // 环境变量配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // TypeORM 数据库配置
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    // JWT 认证
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: jwtConfig,
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // 业务模块
    AuthModule,
    UsersModule,
    AuditModule,
    PatientsModule,
    ConsultationsModule,
    EmrModule,
    ConferencesModule,
    HealthModule,
    SocialModule,
  ],
  providers: [
    // 全局 JWT 认证守卫（@Public() 跳过）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 全局角色守卫（@Roles() 生效）
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
