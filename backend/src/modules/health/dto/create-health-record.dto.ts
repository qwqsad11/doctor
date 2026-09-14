import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateHealthRecordDto {
  @IsOptional() @IsString() @Length(0, 5000) goals?: string;
  @IsOptional() @IsString() @Length(0, 5000) guidance?: string;

  @ApiProperty({ description: "Patient ID" })
  @IsUUID()
  patient_id: string;

  @ApiProperty({ description: "Health plan" })
  @IsString()
  @Length(1, 200)
  plan: string;

  @ApiPropertyOptional({ description: "Latest metrics" })
  @IsOptional()
  @IsString()
  metrics?: string;

  @ApiPropertyOptional({ description: "Local demo device source" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  device_source?: string;

  @ApiPropertyOptional({ description: "Local reminder rule" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  reminder?: string;

  @ApiPropertyOptional({
    description: "Alert level",
    enum: ["正常", "预警", "异常"],
  })
  @IsOptional()
  @IsEnum(["正常", "预警", "异常"])
  alert_level?: "正常" | "预警" | "异常";
}
