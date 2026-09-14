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

@ApiTags("Remote Conferences")
@ApiBearerAuth()
@Controller("api/v1/conferences")
export class ConferencesController {
  constructor(private readonly conferencesService: ConferencesService) {}

  @Post()
  @ApiOperation({ summary: "Start conference" })
  create(
    @Body() dto: CreateConferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: "List conferences (pagination and search)" })
  findAll(
    @Query() query: QueryConferenceDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.findAll(query, user);
  }

  @Get(":id")
  @ApiOperation({ summary: "Conference details" })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.findOne(id, user);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update conference (start, complete, or change status)" })
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
  @ApiOperation({ summary: "Delete conference" })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.conferencesService.remove(id, user);
  }
}
