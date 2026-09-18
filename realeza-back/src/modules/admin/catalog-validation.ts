import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, QueryFailedError } from 'typeorm';
import { Course } from '../courses/course.entity';
export async function catalogCourse(manager: EntityManager, id: string): Promise<Course> {
  const course = await manager.findOne(Course, {
    where: { id },
    lock: { mode: 'pessimistic_read' },
  });
  if (!course)
    throw new BadRequestException({ code: 'INVALID_COURSE', message: 'Curso inexistente.' });
  return course;
}
export function validSemester(course: Course, semester: number) {
  if (!Number.isInteger(semester) || semester < 1 || semester > course.totalSemesters)
    throw new BadRequestException({
      code: 'INVALID_SEMESTER',
      message: 'Período fora dos limites do curso.',
    });
}
export function notFound(resource: string): never {
  throw new NotFoundException({
    code: 'CATALOG_NOT_FOUND',
    message: `${resource} não encontrado.`,
  });
}
export function uniqueError(error: unknown, code: string, message: string): never {
  if (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === '23505'
  )
    throw new ConflictException({ code, message });
  throw error;
}
