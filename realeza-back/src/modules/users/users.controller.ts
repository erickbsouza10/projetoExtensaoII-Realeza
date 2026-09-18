import { ApiErrorDto } from '../../common/api-error.dto';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from './user.entity';
import { userProfile, UserProfileDto } from './user-profile.dto';
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  @Get('me')
  @ApiOkResponse({ type: UserProfileDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'JWT ausente, inválido ou expirado.' })
  me(@CurrentUser() user: User) {
    return userProfile(user);
  }
}
