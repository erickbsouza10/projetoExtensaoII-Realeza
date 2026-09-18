import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Question } from '../questions/question.entity';
import { QuestionOption } from '../questions/question-option.entity';
import { Subject } from '../subjects/subject.entity';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  AdminQuestionQueryDto,
  AdminQuestionDto,
} from './admin.dto';
import { catalogCourse, notFound, validSemester } from './catalog-validation';
@Injectable()
export class AdminQuestionsService {
  constructor(private readonly database: DataSource) {}
  private query(manager: EntityManager = this.database.manager) {
    return manager
      .getRepository(Question)
      .createQueryBuilder('question')
      .innerJoinAndSelect('question.course', 'course')
      .innerJoinAndSelect('question.subject', 'subject')
      .innerJoinAndSelect('subject.course', 'subjectCourse')
      .leftJoinAndSelect('question.options', 'option')
      .addSelect('option.isCorrect');
  }
  private view(question: Question): AdminQuestionDto {
    return {
      id: question.id,
      course: question.course,
      subject: question.subject,
      semester: question.semester,
      difficulty: question.difficulty,
      statement: question.statement,
      active: question.active,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      options: question.options
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          id: option.id,
          text: option.text,
          position: option.position,
          isCorrect: option.isCorrect,
        })),
    };
  }
  async list(query: AdminQuestionQueryDto) {
    const builder = this.query();
    if (query.courseId)
      builder.andWhere('question.course_id = :courseId', { courseId: query.courseId });
    if (query.semester !== undefined)
      builder.andWhere('question.semester = :semester', { semester: query.semester });
    if (query.subjectId)
      builder.andWhere('question.subject_id = :subjectId', { subjectId: query.subjectId });
    if (query.difficulty)
      builder.andWhere('question.difficulty = :difficulty', { difficulty: query.difficulty });
    if (query.active !== undefined)
      builder.andWhere('question.active = :active', { active: query.active });
    const [questions, total] = await builder
      .orderBy('question.createdAt', 'DESC')
      .addOrderBy('question.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      data: questions.map((question) => this.view(question)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  async get(id: string) {
    const question = await this.query().where('question.id = :id', { id }).getOne();
    if (!question) notFound('Questão');
    return this.view(question);
  }
  async create(dto: CreateQuestionDto) {
    return this.write(undefined, dto);
  }
  async update(id: string, dto: UpdateQuestionDto) {
    return this.write(id, dto);
  }
  private async write(id: string | undefined, dto: CreateQuestionDto | UpdateQuestionDto) {
    return this.database.transaction(async (manager) => {
      const before = id
        ? await this.query(manager).where('question.id = :id', { id }).getOne()
        : null;
      if (id && !before) notFound('Questão');
      const course = await catalogCourse(manager, dto.courseId ?? before!.course.id);
      const semester = dto.semester ?? before!.semester;
      validSemester(course, semester);
      const subjectId = dto.subjectId ?? before!.subject.id;
      const subject = await manager.findOne(Subject, {
        where: { id: subjectId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!subject)
        throw new BadRequestException({
          code: 'INVALID_SUBJECT',
          message: 'Disciplina inexistente.',
        });
      const subjectWithCourse = await manager.findOneOrFail(Subject, {
        where: { id: subjectId },
        relations: { course: true },
      });
      if (subjectWithCourse.course.id !== course.id || subject.semester !== semester)
        throw new BadRequestException({
          code: 'SUBJECT_PROFILE_MISMATCH',
          message: 'A disciplina não pertence ao curso e período selecionados.',
        });
      let current = before;
      if (id) {
        await manager.findOne(Question, { where: { id }, lock: { mode: 'pessimistic_write' } });
        current = await this.query(manager).where('question.id = :id', { id }).getOne();
        if (!current) notFound('Questão');
        if (
          current.course.id !== before!.course.id ||
          current.semester !== before!.semester ||
          current.subject.id !== before!.subject.id
        )
          throw new ConflictException({
            code: 'CATALOG_CHANGED',
            message: 'A questão foi alterada. Atualize a página e tente novamente.',
          });
      }
      const active = dto.active ?? current?.active ?? true;
      if (active && (!course.active || !subject.active))
        throw new BadRequestException({
          code: 'INACTIVE_QUESTION_PARENT',
          message: 'Ative o curso e a disciplina antes de ativar esta questão.',
        });
      const question = await manager.save(
        Question,
        manager.create(Question, {
          ...(current ? { id: current.id, createdAt: current.createdAt } : {}),
          course,
          subject: subjectWithCourse,
          semester,
          active,
          statement: dto.statement ?? current!.statement,
          difficulty: dto.difficulty ?? current!.difficulty,
        }),
      );
      if (dto.options) {
        // Remove the previous correct flag first, respecting the unique partial index.
        await manager.update(
          QuestionOption,
          { question: { id: question.id } },
          { isCorrect: false },
        );
        const options = dto.options.map((option, position) =>
          manager.create(QuestionOption, {
            ...(current?.options.find((item) => item.position === position)
              ? { id: current.options.find((item) => item.position === position)!.id }
              : {}),
            question,
            text: option.text,
            position,
            isCorrect: option.isCorrect,
          }),
        );
        await manager.save(QuestionOption, options);
      }
      const saved = await this.query(manager)
        .where('question.id = :id', { id: question.id })
        .getOne();
      return this.view(saved!);
    });
  }
}
