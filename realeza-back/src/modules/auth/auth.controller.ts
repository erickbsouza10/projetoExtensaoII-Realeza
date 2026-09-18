import { ApiErrorDto } from '../../common/api-error.dto';
import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthSessionDto, LoginDto, RegisterDto } from './auth.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { userProfile, UserProfileDto } from '../users/user-profile.dto';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register')
  @ApiCreatedResponse({ type: AuthSessionDto })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'REGISTRATION_ALREADY_EXISTS' })
  @ApiBadRequestResponse({
    type: ApiErrorDto,
    description: 'VALIDATION_ERROR, INVALID_COURSE ou INVALID_SEMESTER',
  })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'USER_NOT_REGISTERED' })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'INVALID_CREDENTIALS' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'JWT ausente, inválido ou expirado.' })
  me(@CurrentUser() user: User) {
    return userProfile(user);
  }
}
