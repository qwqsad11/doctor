import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConsultationDto {
  @ApiProperty({ description: "Patient ID" })
  @IsUUID()
  patient_id: string;

  @ApiProperty({ description: "Consultation type", enum: ['图文', '视频'] })
  @IsEnum(['图文', '视频'])
  type: '图文' | '视频';

  @ApiPropertyOptional({ description: "Chief complaint" })
  @IsOptional()
  @IsString()
  symptom?: string;

  @ApiPropertyOptional({ description: "Local demo attachment notes" })
  @IsOptional()
  @IsString()
  attachments?: string;
}
