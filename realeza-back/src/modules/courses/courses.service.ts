import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './course.entity';
@Injectable()
export class CoursesService {
  constructor(@InjectRepository(Course) private readonly courses: Repository<Course>) {}
  listActive() {
    return this.courses.find({
      where: { active: true },
      select: { id: true, name: true, code: true, totalSemesters: true },
      order: { name: 'ASC' },
    });
  }
  findActive(id: string) {
    return this.courses.findOneBy({ id, active: true });
  }
}
