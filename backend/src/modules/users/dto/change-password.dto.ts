import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '请输入当前密码' })
  old_password: string;

  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  @MaxLength(50)
  new_password: string;
}
