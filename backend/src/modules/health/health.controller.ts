import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { HealthService } from "./health.service";
import { CreateHealthRecordDto } from "./dto/create-health-record.dto";
import { UpdateHealthRecordDto } from "./dto/update-health-record.dto";
import { QueryHealthRecordDto } from "./dto/query-health-record.dto";
import {
  MeasurementDto,
  ReminderDto,
  AssessmentDto,
} from "./dto/health-actions.dto";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
@ApiTags("健康管理")
@ApiBearerAuth()
@Controller("api/v1/health")
export class HealthController {
  constructor(private readonly service: HealthService) {}
  @Public() @Get("patient-portal") patientView(
    @Headers("x-patient-token") token: string,
  ) {
    return this.service.patientView(token || "");
  }
  @Public() @Post("patient-portal/measurements") patientUpload(
    @Headers("x-patient-token") token: string,
    @Body() dto: MeasurementDto,
  ) {
    return this.service.patientMeasurement(token || "", dto);
  }
  @Post() create(
    @Body() dto: CreateHealthRecordDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.create(dto, u);
  }
  @Get() list(
    @Query() q: QueryHealthRecordDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.findAll(q, u);
  }
  @Get(":id") detail(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.detail(id, u);
  }
  @Patch(":id") update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateHealthRecordDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.update(id, dto, u);
  }
  @Delete(":id") remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.remove(id, u);
  }
  @Post(":id/measurements") measurement(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MeasurementDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.measurement(id, dto, u);
  }
  @Post(":id/reminders") reminder(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReminderDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.reminder(id, dto, u);
  }
  @Delete(":id/reminders/:rid") cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("rid", ParseUUIDPipe) rid: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.cancelReminder(id, rid, u);
  }
  @Post(":id/assessments") assessment(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssessmentDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.assessment(id, dto, u);
  }
  @Post(":id/patient-access") access(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.createAccess(id, u);
  }
  @Delete(":id/patient-access") revoke(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.revokeAccess(id, u);
  }
}
