import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
export class QueryEmrDto extends PaginationQueryDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsIn(["门诊病历", "住院病历", "体检报告"]) type?: string;
  @IsOptional()
  @IsIn(["草稿", "待审核", "已审核", "已归档", "已退回"])
  status?: string;
}
