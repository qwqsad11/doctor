import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateHealthRecordDto {
  @IsOptional() @IsString() @Length(0, 5000) goals?: string;
  @IsOptional() @IsString() @Length(0, 5000) guidance?: string;

  @ApiProperty({ description: "患者ID" })
  @IsUUID()
  patient_id: string;

  @ApiProperty({ description: "健康计划" })
  @IsString()
  @Length(1, 200)
  plan: string;

  @ApiPropertyOptional({ description: "最新指标" })
  @IsOptional()
  @IsString()
  metrics?: string;

  @ApiPropertyOptional({ description: "本地模拟设备来源" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  device_source?: string;

  @ApiPropertyOptional({ description: "本地提醒规则" })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  reminder?: string;

  @ApiPropertyOptional({
    description: "预警等级",
    enum: ["正常", "预警", "异常"],
  })
  @IsOptional()
  @IsEnum(["正常", "预警", "异常"])
  alert_level?: "正常" | "预警" | "异常";
}
