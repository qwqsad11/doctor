import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: "Username cannot be empty" })
  @MinLength(3, { message: "Username must be at least 3 characters" })
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: "Username may contain only letters, numbers, and underscores" })
  username: string;

  @IsEmail({}, { message: "Enter a valid email address" })
  email: string;

  @IsString()
  @MinLength(6, { message: "Password must be at least 6 characters" })
  @MaxLength(50)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  real_name?: string;
}
