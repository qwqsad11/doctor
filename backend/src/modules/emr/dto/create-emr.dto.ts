import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
} from "class-validator";
export class CreateEmrDto {
  @IsUUID() patient_id: string;
  @IsIn(["门诊病历", "住院病历", "体检报告"]) type:
    "门诊病历" | "住院病历" | "体检报告";
  @IsOptional() @IsString() @MaxLength(5000) diagnosis?: string;
  @IsOptional() @IsString() @MaxLength(30000) content?: string;
  @IsOptional()
  @IsIn(["outpatient", "inpatient", "checkup"])
  template_id?: string;
  @IsOptional() @IsObject() structured_content?: Record<string, string>;
}
