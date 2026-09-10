import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateEmrDto } from './create-emr.dto';

export class UpdateEmrDto extends PartialType(CreateEmrDto) {
  @ApiPropertyOptional({
    description: '状态',
    enum: ['草稿', '待审核', '已归档', '已退回'],
  })
  @IsOptional()
  @IsEnum(['草稿', '待审核', '已归档', '已退回'])
  status?: '草稿' | '待审核' | '已归档' | '已退回';
}
