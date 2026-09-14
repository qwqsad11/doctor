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

@ApiTags("Patients")
@ApiBearerAuth()
@Controller('api/v1/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: "Add patient" })
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: "List patients (pagination and search)" })
  findAll(
    @Query() query: QueryPatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: "Patient details" })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update patient" })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Delete patient" })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.remove(id, user);
  }
}
