import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryConsultationDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search keyword (patient or ID)" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "Consultation type", enum: ['图文', '视频'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "Status", enum: ['待接诊', '进行中', '已完成'] })
  @IsOptional()
  @IsString()
  status?: string;
}
