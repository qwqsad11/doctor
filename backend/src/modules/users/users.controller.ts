import {
  Controller,
  Query,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Delete,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Request } from "express";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { QueryDoctorsDto } from "./dto/query-doctors.dto";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { SetUserRolesDto } from "./dto/set-user-roles.dto";
import { CreateTempPermissionDto } from "./dto/create-temp-permission.dto";

const AVATAR_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

@ApiTags("Users")
@Controller("api/v1/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("departments")
  departments() {
    return this.usersService.departments();
  }

  @Get("doctors")
  doctors(
    @Query() query: QueryDoctorsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.doctors(query, user.userId);
  }

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update current user profile" })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Post("me/password")
  @ApiOperation({ summary: "Change password" })
  changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.userId, dto);
  }

  @Post("me/avatar")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: "Upload avatar (multipart/form-data field: file)" })
  uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    if (!file) throw new BadRequestException("Upload an image file");

    const ext = AVATAR_EXT[file.mimetype];
    if (!ext)
      throw new BadRequestException("Only JPG, PNG, WebP, and GIF images are supported");

    const filename = `${user.userId}-${Date.now()}.${ext}`;
    const dir = join(process.cwd(), "uploads", "avatars");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), file.buffer);

    const base = `${req.protocol}://${req.get("host")}`;
    const url = `${base}/uploads/avatars/${filename}`;
    return this.usersService.updateAvatar(user.userId, url);
  }

  @Get("admin/users")
  @Roles("admin")
  listUsers() {
    return this.usersService.listUsers();
  }

  @Patch("admin/users/:id/roles")
  @Roles("admin")
  setRoles(
    @Param("id") id: string,
    @Body() dto: SetUserRolesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.setRoles(id, dto, user);
  }

  @Get("admin/temp-permissions")
  @Roles("admin")
  listTempPermissions() {
    return this.usersService.listTempPermissions();
  }

  @Post("admin/temp-permissions")
  @Roles("admin")
  createTempPermission(
    @Body() dto: CreateTempPermissionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.createTempPermission(dto, user);
  }

  @Delete("admin/temp-permissions/:id")
  @Roles("admin")
  async revokeTempPermission(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.usersService.revokeTempPermission(id, user);
    return { message: "Temporary permission revoked" };
  }
}
