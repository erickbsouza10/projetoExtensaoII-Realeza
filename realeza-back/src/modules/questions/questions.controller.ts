import { ApiErrorDto } from '../../common/api-error.dto';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { QuestionDto, QuestionQueryDto } from './question.dto';
import { QuestionsService } from './questions.service';
@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questions: QuestionsService) {}
  @Get('random')
  @ApiOkResponse({ type: QuestionDto })
  @ApiNotFoundResponse({ type: ApiErrorDto, description: 'QUESTION_NOT_FOUND' })
  random(@CurrentUser() user: User, @Query() query: QuestionQueryDto) {
    return this.questions.randomFor(user, query.difficulty);
  }
}
