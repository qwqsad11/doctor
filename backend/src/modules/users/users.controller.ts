import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

const AVATAR_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@ApiTags('用户')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户档案' })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户档案' })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Post('me/password')
  @ApiOperation({ summary: '修改密码' })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  @ApiOperation({ summary: '上传头像（multipart/form-data 字段名 file）' })
  uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException('请上传图片文件');

    const ext = AVATAR_EXT[file.mimetype];
    if (!ext) throw new BadRequestException('仅支持 JPG / PNG / WebP / GIF 图片');

    const filename = `${user.userId}-${Date.now()}.${ext}`;
    const dir = join(process.cwd(), 'uploads', 'avatars');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), file.buffer);

    const base = `${req.protocol}://${req.get('host')}`;
    const url = `${base}/uploads/avatars/${filename}`;
    return this.usersService.updateAvatar(user.userId, url);
  }
}
