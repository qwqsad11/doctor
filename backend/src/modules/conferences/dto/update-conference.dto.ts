import { PartialType, OmitType } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CreateConferenceDto } from "./create-conference.dto";
export class UpdateConferenceDto extends PartialType(
  OmitType(CreateConferenceDto, ["patient_id", "experts"] as const),
) {
  @IsOptional() @IsIn(["待会诊", "进行中", "已完成"]) status?:
    "待会诊" | "进行中" | "已完成";
}
