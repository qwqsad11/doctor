import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ description: "Name" })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ description: "Gender", enum: ['男', '女'] })
  @IsEnum(['男', '女'])
  gender: '男' | '女';

  @ApiProperty({ description: "Age" })
  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @ApiPropertyOptional({ description: "Phone" })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional({ description: "Condition group" })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ description: "Main symptoms" })
  @IsOptional()
  @IsString()
  symptom?: string;
}
