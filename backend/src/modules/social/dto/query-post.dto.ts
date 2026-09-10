import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPostDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（标题/内容）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '科室/圈子' })
  @IsOptional()
  @IsString()
  circle?: string;
}
