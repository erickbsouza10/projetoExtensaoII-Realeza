import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CourseDto } from './course.dto';
@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}
  @Get()
  @ApiOkResponse({ type: [CourseDto] })
  list() {
    return this.courses.listActive();
  }
}
