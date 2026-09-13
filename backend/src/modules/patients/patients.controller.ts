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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('患者管理')
@ApiBearerAuth()
@Controller('api/v1/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: '新增患者' })
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: '患者列表（分页 + 搜索）' })
  findAll(
    @Query() query: QueryPatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '患者详情' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新患者' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除患者' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.remove(id, user);
  }
}
