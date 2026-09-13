import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConsultationDto {
  @ApiProperty({ description: '患者ID' })
  @IsUUID()
  patient_id: string;

  @ApiProperty({ description: '问诊类型', enum: ['图文', '视频'] })
  @IsEnum(['图文', '视频'])
  type: '图文' | '视频';

  @ApiPropertyOptional({ description: '主诉' })
  @IsOptional()
  @IsString()
  symptom?: string;

  @ApiPropertyOptional({ description: '本地模拟附件说明' })
  @IsOptional()
  @IsString()
  attachments?: string;
}
