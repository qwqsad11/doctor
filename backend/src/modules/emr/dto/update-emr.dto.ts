import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateEmrDto } from "./create-emr.dto";
export class UpdateEmrDto extends PartialType(
  OmitType(CreateEmrDto, ["patient_id"] as const),
) {}
