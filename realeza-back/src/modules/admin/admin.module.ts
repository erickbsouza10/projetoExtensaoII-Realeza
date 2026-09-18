import { Module } from '@nestjs/common';
import {
  AdminCoursesController,
  AdminSubjectsController,
  AdminQuestionsController,
  AdminDashboardController,
} from './admin.controllers';
import { AdminCoursesService } from './admin-courses.service';
import { AdminSubjectsService } from './admin-subjects.service';
import { AdminQuestionsService } from './admin-questions.service';
import { RolesGuard } from '../../common/guards/roles.guard';
@Module({
  controllers: [
    AdminCoursesController,
    AdminSubjectsController,
    AdminQuestionsController,
    AdminDashboardController,
  ],
  providers: [AdminCoursesService, AdminSubjectsService, AdminQuestionsService, RolesGuard],
})
export class AdminModule {}
