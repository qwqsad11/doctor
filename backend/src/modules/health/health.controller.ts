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
import { HealthService } from './health.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { QueryHealthRecordDto } from './dto/query-health-record.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('健康管理')
@ApiBearerAuth()
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Post()
  @ApiOperation({ summary: '制定健康计划' })
  create(
    @Body() dto: CreateHealthRecordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.healthService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: '健康计划列表（分页 + 搜索）' })
  findAll(
    @Query() query: QueryHealthRecordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.healthService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '健康计划详情' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.healthService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '调整健康计划' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHealthRecordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.healthService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除健康计划' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.healthService.remove(id, user);
  }
}
