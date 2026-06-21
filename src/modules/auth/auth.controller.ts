import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  AUTH_LOGIN_THROTTLE,
  AUTH_THROTTLE,
} from '../../common/constants/throttle.constants';

@ApiTags('auth')
@Controller('auth')
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle(AUTH_LOGIN_THROTTLE)
  @ApiOperation({ summary: 'Login with Stellar wallet signature' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login successful, returns access token' })
  @ApiResponse({ status: 401, description: 'Invalid signature or wallet not found' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get auth module status' })
  @ApiResponse({ status: 200, description: 'Module status' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  status() {
    return this.authService.getStatus();
  }
}