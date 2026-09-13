import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";
export class CreateConferenceDto {
  @ApiProperty() @IsString() @Length(1, 200) topic: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() patient_id?: string;
  @ApiPropertyOptional({ type: [String], description: "邀请的医生账号ID" })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID("4", { each: true })
  expert_ids?: string[];
  // Legacy labels are retained for imported records; labels never grant account access.
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  experts?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduled_at?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 10000)
  summary?: string;
}
