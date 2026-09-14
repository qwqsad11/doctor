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
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { EmrService } from "./emr.service";
import { CreateEmrDto } from "./dto/create-emr.dto";
import { UpdateEmrDto } from "./dto/update-emr.dto";
import { QueryEmrDto } from "./dto/query-emr.dto";
import {
  SubmitEmrDto,
  ReviewEmrDto,
  MedicalOrderDto,
  StopOrderDto,
} from "./dto/emr-workflow.dto";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { EMR_TEMPLATES } from "./emr.templates";
@ApiTags("Medical Records")
@ApiBearerAuth()
@Controller("api/v1/emr")
export class EmrController {
  constructor(private readonly service: EmrService) {}
  @Get("templates") templates() {
    return EMR_TEMPLATES;
  }
  @Get("reviewers") reviewers(@CurrentUser() u: CurrentUserPayload) {
    return this.service.reviewers(u);
  }
  @Post() create(
    @Body() dto: CreateEmrDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.create(dto, u);
  }
  @Get() list(@Query() q: QueryEmrDto, @CurrentUser() u: CurrentUserPayload) {
    return this.service.findAll(q, u);
  }
  @Get(":id") detail(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.findOne(id, u);
  }
  @Patch(":id") update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmrDto,
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
  @Post(":id/submit") submit(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubmitEmrDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.submit(id, dto.reviewer_id, u);
  }
  @Post(":id/review") review(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewEmrDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.review(id, dto, u);
  }
  @Post(":id/archive") archive(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.archive(id, u);
  }
  @Post(":id/orders") order(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MedicalOrderDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.order(id, dto, u);
  }
  @Patch(":id/orders/:orderId") updateOrder(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: MedicalOrderDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.order(id, dto, u, orderId);
  }
  @Post(":id/orders/:orderId/stop") stop(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("orderId", ParseUUIDPipe) orderId: string,
    @Body() dto: StopOrderDto,
    @CurrentUser() u: CurrentUserPayload,
  ) {
    return this.service.stopOrder(id, orderId, dto.reason, u);
  }
}
