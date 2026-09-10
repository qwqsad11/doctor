import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryEmrDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（患者/编号/诊断）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '病历类型', enum: ['门诊病历', '住院病历', '体检报告'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['草稿', '待审核', '已归档', '已退回'] })
  @IsOptional()
  @IsString()
  status?: string;
}
