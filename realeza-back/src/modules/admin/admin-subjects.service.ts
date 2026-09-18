import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Subject } from '../subjects/subject.entity';
import { Question } from '../questions/question.entity';
import { CreateSubjectDto, UpdateSubjectDto, AdminSubjectQueryDto } from './admin.dto';
import { catalogCourse, notFound, uniqueError, validSemester } from './catalog-validation';
@Injectable()
export class AdminSubjectsService {
  constructor(private readonly database: DataSource) {}
  list(query: AdminSubjectQueryDto) {
    return this.database.getRepository(Subject).find({
      relations: { course: true },
      where: {
        ...(query.courseId ? { course: { id: query.courseId } } : {}),
        ...(query.semester !== undefined ? { semester: query.semester } : {}),
        ...(query.active !== undefined ? { active: query.active } : {}),
      },
      order: { name: 'ASC', id: 'ASC' },
    });
  }
  async create(dto: CreateSubjectDto) {
    try {
      return await this.database.transaction(async (manager) => {
        const course = await catalogCourse(manager, dto.courseId);
        validSemester(course, dto.semester);
        return manager.save(
          Subject,
          manager.create(Subject, {
            name: dto.name,
            course,
            semester: dto.semester,
            active: dto.active ?? true,
          }),
        );
      });
    } catch (error) {
      uniqueError(
        error,
        'SUBJECT_ALREADY_EXISTS',
        'Esta disciplina já existe neste curso e período.',
      );
    }
  }
  async update(id: string, dto: UpdateSubjectDto) {
    try {
      return await this.database.transaction(async (manager) => {
        const before = await manager.findOne(Subject, {
          where: { id },
          relations: { course: true },
        });
        if (!before) notFound('Disciplina');
        const course = await catalogCourse(manager, dto.courseId ?? before.course.id);
        const subject = await manager.findOne(Subject, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!subject) notFound('Disciplina');
        // Re-read after the row lock to avoid applying an update to a concurrently moved subject.
        const current = await manager.findOneOrFail(Subject, {
          where: { id },
          relations: { course: true },
        });
        if (dto.courseId === undefined && current.course.id !== course.id)
          throw new ConflictException({
            code: 'CATALOG_CHANGED',
            message: 'A disciplina foi alterada. Atualize a página e tente novamente.',
          });
        const semester = dto.semester ?? current.semester;
        validSemester(course, semester);
        if (
          (course.id !== current.course.id || semester !== current.semester) &&
          (await manager.exists(Question, { where: { subject: { id } } }))
        )
          throw new ConflictException({
            code: 'SUBJECT_IN_USE',
            message:
              'Esta disciplina possui questões. Mantenha o curso/período ou mova as questões primeiro.',
          });
        return manager.save(
          Subject,
          Object.assign(current, {
            name: dto.name ?? current.name,
            course,
            semester,
            active: dto.active ?? current.active,
          }),
        );
      });
    } catch (error) {
      uniqueError(
        error,
        'SUBJECT_ALREADY_EXISTS',
        'Esta disciplina já existe neste curso e período.',
      );
    }
  }
}
