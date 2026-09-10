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
  @ApiProperty({ description: '姓名' })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ description: '性别', enum: ['男', '女'] })
  @IsEnum(['男', '女'])
  gender: '男' | '女';

  @ApiProperty({ description: '年龄' })
  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @ApiPropertyOptional({ description: '电话' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional({ description: '病种分组' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiPropertyOptional({ description: '主要症状' })
  @IsOptional()
  @IsString()
  symptom?: string;
}
