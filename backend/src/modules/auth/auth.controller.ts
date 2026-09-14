import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags("Authentication")
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 登录
   * @param loginDto 登录信息
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User sign-in" })
  @ApiResponse({
    status: 200,
    description: "Sign-in successful; returns a JWT token",
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 注册
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "User registration" })
  @ApiResponse({
    status: 201,
    description: "Registration successful",
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 刷新Token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh token" })
  async refreshToken() {
    // TODO: 实现刷新Token逻辑
    return {
      access_token: 'new_jwt_token_here',
    };
  }
}
