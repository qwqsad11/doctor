import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateConferenceDto {
  @ApiProperty({ description: '会诊主题' })
  @IsString()
  @Length(1, 200)
  topic: string;

  @ApiPropertyOptional({ description: '患者ID' })
  @IsOptional()
  @IsUUID()
  patient_id?: string;

  @ApiPropertyOptional({ description: '参会专家姓名', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experts?: string[];

  @ApiPropertyOptional({ description: '会诊时间' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ description: '会诊说明' })
  @IsOptional()
  @IsString()
  summary?: string;
}
