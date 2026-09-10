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
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { QueryConsultationDto } from './dto/query-consultation.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('在线问诊')
@ApiBearerAuth()
@Controller('api/v1/consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @ApiOperation({ summary: '新建问诊' })
  create(
    @Body() dto: CreateConsultationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consultationsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: '问诊列表（分页 + 搜索）' })
  findAll(
    @Query() query: QueryConsultationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consultationsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '问诊详情' })
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新问诊（接诊/完成等状态流转）' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consultationsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除问诊' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.consultationsService.remove(id, user);
  }
}
