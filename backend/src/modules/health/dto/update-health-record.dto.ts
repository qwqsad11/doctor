import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateHealthRecordDto } from "./create-health-record.dto";

export class UpdateHealthRecordDto extends PartialType(
  OmitType(CreateHealthRecordDto, ["patient_id"] as const),
) {}
