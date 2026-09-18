import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './question.entity';
import { QuestionDto } from './question.dto';
import { User } from '../users/user.entity';
import { Difficulty } from '../../common/enums/difficulty.enum';
@Injectable()
export class QuestionsService {
  constructor(@InjectRepository(Question) private readonly questions: Repository<Question>) {}
  // The authenticated database profile is the only source of course and semester.
  async randomFor(user: User, difficulty: Difficulty): Promise<QuestionDto> {
    if (!user.course || user.semester === null)
      throw new ForbiddenException({
        code: 'ACADEMIC_PROFILE_REQUIRED',
        message: 'Esta conta não possui perfil de aluno.',
      });
    const question = await this.questions
      .createQueryBuilder('question')
      .innerJoinAndSelect('question.subject', 'subject')
      .innerJoin('question.course', 'course')
      .where(
        'question.course_id = :courseId AND question.semester = :semester AND question.difficulty = :difficulty AND question.active = true AND subject.active = true AND course.active = true',
        { courseId: user.course.id, semester: user.semester, difficulty },
      )
      .orderBy('RANDOM()')
      .getOne();
    if (!question)
      throw new NotFoundException({
        code: 'QUESTION_NOT_FOUND',
        message: 'Nenhuma pergunta disponível para seu curso, período e dificuldade.',
      });
    const withOptions = await this.questions.findOneOrFail({
      where: { id: question.id },
      relations: { options: true },
    });
    // Explicit projection: correct answers never cross the HTTP boundary.
    return {
      id: question.id,
      statement: question.statement,
      difficulty: question.difficulty,
      subject: { id: question.subject.id, name: question.subject.name },
      options: withOptions.options
        .sort((a, b) => a.position - b.position)
        .map((option) => ({ id: option.id, text: option.text, position: option.position })),
    };
  }
}
