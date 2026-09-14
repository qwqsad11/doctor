import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @ApiPropertyOptional({ description: "Status", enum: ['在管', '待随访', '已转出'] })
  @IsOptional()
  @IsEnum(['在管', '待随访', '已转出'])
  status?: '在管' | '待随访' | '已转出';
}
