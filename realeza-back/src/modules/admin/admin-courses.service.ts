import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Course } from '../courses/course.entity';
import { CreateCourseDto, UpdateCourseDto } from './admin.dto';
import { notFound, uniqueError } from './catalog-validation';
@Injectable()
export class AdminCoursesService {
  constructor(private readonly database: DataSource) {}
  list() {
    return this.database.getRepository(Course).find({ order: { name: 'ASC', id: 'ASC' } });
  }
  async create(dto: CreateCourseDto) {
    try {
      return await this.database
        .getRepository(Course)
        .save(this.database.getRepository(Course).create(dto));
    } catch (error) {
      uniqueError(error, 'COURSE_CODE_ALREADY_EXISTS', 'Este código de curso já está cadastrado.');
    }
  }
  async update(id: string, dto: UpdateCourseDto) {
    try {
      return await this.database.transaction(async (manager) => {
        const course = await manager.findOne(Course, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!course) notFound('Curso');
        if (dto.totalSemesters !== undefined && dto.totalSemesters < course.totalSemesters) {
          const rows: { used: boolean }[] = await manager.query(
            `SELECT EXISTS (
            SELECT 1 FROM users WHERE course_id = $1 AND semester > $2
            UNION ALL SELECT 1 FROM subjects WHERE course_id = $1 AND semester > $2
            UNION ALL SELECT 1 FROM questions WHERE course_id = $1 AND semester > $2
          ) AS used`,
            [id, dto.totalSemesters],
          );
          if (rows[0].used)
            throw new ConflictException({
              code: 'COURSE_SEMESTERS_IN_USE',
              message:
                'Há alunos, disciplinas ou questões em períodos superiores. O total de períodos não pode ser reduzido.',
            });
        }
        return manager.save(Course, Object.assign(course, dto));
      });
    } catch (error) {
      uniqueError(error, 'COURSE_CODE_ALREADY_EXISTS', 'Este código de curso já está cadastrado.');
    }
  }
}
