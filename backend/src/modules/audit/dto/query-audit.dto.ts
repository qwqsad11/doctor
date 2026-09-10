import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAuditDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '关键词（操作人/对象/类型）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '操作类型' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '操作人' })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ enum: ['成功', '失败'] })
  @IsOptional()
  @IsString()
  result?: string;
}
