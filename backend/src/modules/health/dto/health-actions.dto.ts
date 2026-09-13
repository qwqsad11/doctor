import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
export class MeasurementDto {
  @IsIn(["血压", "血糖"]) kind: "血压" | "血糖";
  @IsDateString() measured_at: string;
  @IsOptional() @IsNumber() @Min(1) @Max(400) systolic?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(300) diastolic?: number;
  @IsOptional() @IsNumber() @Min(0.1) @Max(100) glucose?: number;
  @IsOptional() @IsIn(["空腹", "餐后", "随机"]) context?: string;
  @IsOptional() @IsString() @Length(1, 100) source?: string;
  @IsOptional() @IsString() @Length(0, 1000) note?: string;
}
export class ReminderDto {
  @IsString() @Length(1, 500) message: string;
  @IsDateString() next_run_at: string;
  @IsInt() @Min(0) @Max(365) interval_days: number;
}
export class AssessmentDto {
  @IsString() @Length(1, 5000) conclusion: string;
  @IsString() @Length(1, 5000) advice: string;
  @IsIn(["正常", "预警", "异常"]) alert_level: "正常" | "预警" | "异常";
  @IsDateString() next_assessment_at: string;
  @IsOptional() @IsString() @Length(1, 200) revised_plan?: string;
}
