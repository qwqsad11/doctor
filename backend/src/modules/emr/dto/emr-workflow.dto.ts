import { IsIn, IsString, IsUUID, Length } from "class-validator";
export class SubmitEmrDto {
  @IsUUID() reviewer_id: string;
}
export class ReviewEmrDto {
  @IsIn(["approve", "reject"]) decision: "approve" | "reject";
  @IsString() @Length(1, 2000) comment: string;
}
export class MedicalOrderDto {
  @IsIn(["药物", "检查", "检验"]) category: "药物" | "检查" | "检验";
  @IsString() @Length(1, 200) name: string;
  @IsString() @Length(1, 2000) instruction: string;
}
export class StopOrderDto {
  @IsString() @Length(1, 500) reason: string;
}
