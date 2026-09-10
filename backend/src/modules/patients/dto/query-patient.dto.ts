import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPatientDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（姓名/编号/症状/分组）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['在管', '待随访', '已转出'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '病种分组' })
  @IsOptional()
  @IsString()
  group?: string;
}
