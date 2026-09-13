import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryConferenceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "搜索关键词（患者/主题）" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: "状态",
    enum: ["待会诊", "进行中", "已完成"],
  })
  @IsOptional()
  @IsIn(["待会诊", "进行中", "已完成"])
  status?: string;
}
