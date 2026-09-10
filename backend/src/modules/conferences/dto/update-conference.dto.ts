import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateConferenceDto } from './create-conference.dto';

export class UpdateConferenceDto extends PartialType(CreateConferenceDto) {
  @ApiPropertyOptional({ description: '状态', enum: ['待会诊', '进行中', '已完成'] })
  @IsOptional()
  @IsEnum(['待会诊', '进行中', '已完成'])
  status?: '待会诊' | '进行中' | '已完成';
}
