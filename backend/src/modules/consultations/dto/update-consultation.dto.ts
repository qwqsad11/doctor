import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateConsultationDto } from './create-consultation.dto';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
  @ApiPropertyOptional({ description: '状态', enum: ['待接诊', '进行中', '已完成'] })
  @IsOptional()
  @IsEnum(['待接诊', '进行中', '已完成'])
  status?: '待接诊' | '进行中' | '已完成';

  @ApiPropertyOptional({ description: '医嘱' })
  @IsOptional()
  @IsString()
  advice?: string;
}
