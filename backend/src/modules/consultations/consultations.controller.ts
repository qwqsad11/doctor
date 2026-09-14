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

@ApiTags("Consultations")
@ApiBearerAuth()
@Controller('api/v1/consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @ApiOperation({ summary: "Create consultation" })
  create(
    @Body() dto: CreateConsultationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consultationsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: "List consultations (pagination and search)" })
  findAll(
    @Query() query: QueryConsultationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consultationsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Consultation details" })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.consultationsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update consultation (accept, complete, or change status)" })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.consultationsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete consultation" })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.consultationsService.remove(id, user);
  }
}
