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
import { CreateCommentDto } from '../interactions/dto/create-comment.dto';
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
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.socialService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update post" })
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.socialService.update(id, dto);
  }

  @Post(':id/like')
  @ApiOperation({ summary: "Toggle like" })
  like(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.socialService.like(id, user);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: "List comments" })
  listComments(@Param('id') id: string) {
    return this.socialService.listComments(id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: "Add comment" })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.socialService.addComment(id, dto.content, user);
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({ summary: "Delete comment" })
  removeComment(@Param('id') id: string, @Param('commentId') commentId: string) {
    return this.socialService.removeComment(id, commentId);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete post" })
  remove(@Param('id') id: string) {
    return this.socialService.remove(id);
  }
}
