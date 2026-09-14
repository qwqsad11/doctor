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

@ApiTags("Doctor Community")
@ApiBearerAuth()
@Controller('api/v1/social/posts')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @ApiOperation({ summary: "Publish case discussion" })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: CurrentUserPayload) {
    return this.socialService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: "List posts (pagination and search)" })
  findAll(@Query() query: QueryPostDto) {
    return this.socialService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: "Post details" })
  findOne(@Param('id') id: string) {
    return this.socialService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update post" })
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.socialService.update(id, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: "Like" })
  like(@Param('id') id: string) {
    return this.socialService.like(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete post" })
  remove(@Param('id') id: string) {
    return this.socialService.remove(id);
  }
}
