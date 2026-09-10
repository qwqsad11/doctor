import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryHealthRecordDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（患者/计划）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '预警等级', enum: ['正常', '预警', '异常'] })
  @IsOptional()
  @IsString()
  alert_level?: string;
}
