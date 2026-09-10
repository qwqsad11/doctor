import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SocialService } from './social.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('医生社交')
@ApiBearerAuth()
@Controller('api/v1/social/posts')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @ApiOperation({ summary: '发布病例分享' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: CurrentUserPayload) {
    return this.socialService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: '帖子列表（分页 + 搜索）' })
  findAll(@Query() query: QueryPostDto) {
    return this.socialService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '帖子详情' })
  findOne(@Param('id') id: string) {
    return this.socialService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新帖子' })
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.socialService.update(id, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: '点赞' })
  like(@Param('id') id: string) {
    return this.socialService.like(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除帖子' })
  remove(@Param('id') id: string) {
    return this.socialService.remove(id);
  }
}
