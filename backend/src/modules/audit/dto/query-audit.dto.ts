import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAuditDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Keyword (actor, target, or action)" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "Action type" })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Actor" })
  @IsOptional()
  @IsString()
  operator?: string;

  @ApiPropertyOptional({ enum: ['成功', '失败'] })
  @IsOptional()
  @IsString()
  result?: string;
}
