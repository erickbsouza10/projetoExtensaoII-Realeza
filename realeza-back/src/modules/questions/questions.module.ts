import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './question.entity';
import { QuestionOption } from './question-option.entity';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionOption])],
  providers: [QuestionsService],
  controllers: [QuestionsController],
  exports: [QuestionsService],
})
export class QuestionsModule {}
