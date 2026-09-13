import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsIn(['sms', 'email', 'face'])
  factor?: 'sms' | 'email' | 'face';

  @IsOptional()
  @IsString()
  @Length(4, 64)
  verification_code?: string;
}
