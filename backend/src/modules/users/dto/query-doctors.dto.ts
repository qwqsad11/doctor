import { IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
export class QueryDoctorsDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(50) department?: string;
  @IsOptional() @IsString() @MaxLength(100) keyword?: string;
}
