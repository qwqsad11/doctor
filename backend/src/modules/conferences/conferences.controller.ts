import {
  Controller,
  ParseUUIDPipe,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import {
  RespondConferenceDto,
  ConferenceOpinionDto,
} from "./dto/conference-actions.dto";
import { ConferencesService } from "./conferences.service";
import { CreateConferenceDto } from "./dto/create-conference.dto";
import { UpdateConferenceDto } from "./dto/update-conference.dto";
import { QueryConferenceDto } from "./dto/query-conference.dto";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";

@ApiTags("远程会诊")
@ApiBearerAuth()
@Controller("api/v1/conferences")
export class ConferencesController {
  constructor(private readonly conferencesService: ConferencesService) {}

  @Post()
  @ApiOperation({ summary: "发起会诊" })
  create(
    @Body() dto: CreateConferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: "会诊列表（分页 + 搜索）" })
  findAll(
    @Query() query: QueryConferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "会诊详情" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.findOne(id, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "更新会诊（进入会诊/完成等状态流转）" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateConferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.update(id, dto, user);
  }

  @Post(":id/respond")
  respond(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RespondConferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.respond(id, dto.response, user);
  }

  @Post(":id/opinions")
  opinion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConferenceOpinionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.opinion(id, dto.content, user);
  }

  @Delete(":id")
  @ApiOperation({ summary: "删除会诊" })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.remove(id, user);
  }
}
