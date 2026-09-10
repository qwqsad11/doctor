import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEmrDto {
  @ApiProperty({ description: '患者ID' })
  @IsUUID()
  patient_id: string;

  @ApiProperty({ description: '病历类型', enum: ['门诊病历', '住院病历', '体检报告'] })
  @IsEnum(['门诊病历', '住院病历', '体检报告'])
  type: '门诊病历' | '住院病历' | '体检报告';

  @ApiPropertyOptional({ description: '诊断' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ description: '病历内容' })
  @IsOptional()
  @IsString()
  content?: string;
}
