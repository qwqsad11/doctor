import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ description: "Title" })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ description: "Content (must be de-identified)" })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: "Department / Community" })
  @IsOptional()
  @IsString()
  circle?: string;
}
