import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPatientDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search keyword (name, ID, symptoms, or group)" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "Status", enum: ['在管', '待随访', '已转出'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Condition group" })
  @IsOptional()
  @IsString()
  group?: string;
}
