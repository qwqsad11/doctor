import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { TempPermission } from './entities/temp-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission, TempPermission])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
