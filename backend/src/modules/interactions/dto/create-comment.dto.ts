import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: "Comment content" })
  @IsString()
  @Length(1, 1000)
  content: string;
}
