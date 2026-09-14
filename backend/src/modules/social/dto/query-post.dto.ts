import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPostDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search keyword (title or content)" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "Department / Community" })
  @IsOptional()
  @IsString()
  circle?: string;
}
