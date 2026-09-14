import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: "Enter your current password" })
  old_password: string;

  @IsString()
  @MinLength(6, { message: "New password must be at least 6 characters" })
  @MaxLength(50)
  new_password: string;
}
