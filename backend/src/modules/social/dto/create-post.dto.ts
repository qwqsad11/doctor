import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: '标题' })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ description: '内容（须已脱敏）' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '科室/圈子' })
  @IsOptional()
  @IsString()
  circle?: string;
}
