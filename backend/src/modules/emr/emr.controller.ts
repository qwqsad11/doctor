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
import { EmrService } from './emr.service';
import { CreateEmrDto } from './dto/create-emr.dto';
import { UpdateEmrDto } from './dto/update-emr.dto';
import { QueryEmrDto } from './dto/query-emr.dto';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';

@ApiTags('电子病历')
@ApiBearerAuth()
@Controller('api/v1/emr')
export class EmrController {
  constructor(private readonly emrService: EmrService) {}

  @Post()
  @ApiOperation({ summary: '新建病历' })
  create(@Body() dto: CreateEmrDto, @CurrentUser() user: CurrentUserPayload) {
    return this.emrService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: '病历列表（分页 + 搜索）' })
  findAll(@Query() query: QueryEmrDto, @CurrentUser() user: CurrentUserPayload) {
    return this.emrService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: '病历详情' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.emrService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新病历' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmrDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.emrService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除病历' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.emrService.remove(id, user);
  }
}
