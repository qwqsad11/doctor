import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryConsultationDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（患者/编号）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '问诊类型', enum: ['图文', '视频'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['待接诊', '进行中', '已完成'] })
  @IsOptional()
  @IsString()
  status?: string;
}
