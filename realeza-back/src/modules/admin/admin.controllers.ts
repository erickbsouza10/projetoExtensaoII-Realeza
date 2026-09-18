import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiErrorDto } from '../../common/api-error.dto';
import { Course } from '../courses/course.entity';
import { Subject } from '../subjects/subject.entity';
import { Question } from '../questions/question.entity';
import { AdminCoursesService } from './admin-courses.service';
import { AdminSubjectsService } from './admin-subjects.service';
import { AdminQuestionsService } from './admin-questions.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  AdminQuestionQueryDto,
  AdminSubjectQueryDto,
  QuestionStatusDto,
  AdminCourseDto,
  AdminSubjectDto,
  AdminQuestionDto,
  AdminQuestionPageDto,
  AdminStatsDto,
} from './admin.dto';

@ApiTags('admin/courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller('admin/courses')
export class AdminCoursesController {
  constructor(private readonly courses: AdminCoursesService) {}
  @Get() @ApiOkResponse({ type: [AdminCourseDto] }) list() {
    return this.courses.list();
  }
  @Post() @ApiCreatedResponse({ type: AdminCourseDto }) create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }
  @Patch(':id') @ApiOkResponse({ type: AdminCourseDto }) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.courses.update(id, dto);
  }
}

@ApiTags('admin/subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller('admin/subjects')
export class AdminSubjectsController {
  constructor(private readonly subjects: AdminSubjectsService) {}
  @Get() @ApiOkResponse({ type: [AdminSubjectDto] }) list(@Query() query: AdminSubjectQueryDto) {
    return this.subjects.list(query);
  }
  @Post() @ApiCreatedResponse({ type: AdminSubjectDto }) create(@Body() dto: CreateSubjectDto) {
    return this.subjects.create(dto);
  }
  @Patch(':id') @ApiOkResponse({ type: AdminSubjectDto }) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjects.update(id, dto);
  }
}

@ApiTags('admin/questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@ApiBadRequestResponse({ type: ApiErrorDto })
@ApiConflictResponse({ type: ApiErrorDto })
@ApiNotFoundResponse({ type: ApiErrorDto })
@Controller('admin/questions')
export class AdminQuestionsController {
  constructor(private readonly questions: AdminQuestionsService) {}
  @Get() @ApiOkResponse({ type: AdminQuestionPageDto }) list(
    @Query() query: AdminQuestionQueryDto,
  ) {
    return this.questions.list(query);
  }
  @Get(':id') @ApiOkResponse({ type: AdminQuestionDto }) get(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.questions.get(id);
  }
  @Post() @ApiCreatedResponse({ type: AdminQuestionDto }) create(@Body() dto: CreateQuestionDto) {
    return this.questions.create(dto);
  }
  @Patch(':id/status') @ApiOkResponse({ type: AdminQuestionDto }) status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: QuestionStatusDto,
  ) {
    return this.questions.update(id, dto);
  }
  @Patch(':id') @ApiOkResponse({ type: AdminQuestionDto }) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questions.update(id, dto);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiUnauthorizedResponse({ type: ApiErrorDto })
@ApiForbiddenResponse({ type: ApiErrorDto })
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly database: DataSource) {}
  @Get('stats')
  @ApiOkResponse({ type: AdminStatsDto })
  async stats() {
    const [courses, subjects, questions] = await Promise.all([
      this.database.getRepository(Course).count(),
      this.database.getRepository(Subject).count(),
      this.database.getRepository(Question).count(),
    ]);
    return { courses, subjects, questions };
  }
}
