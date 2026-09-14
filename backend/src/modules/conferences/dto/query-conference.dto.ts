import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

export class QueryConferenceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Search keyword (patient or topic)" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: "Status",
    enum: ["待会诊", "进行中", "已完成"],
  })
  @IsOptional()
  @IsIn(["待会诊", "进行中", "已完成"])
  status?: string;
}
