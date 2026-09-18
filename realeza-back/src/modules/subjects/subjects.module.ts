import { ForbiddenException, Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../users/user.entity';
import { Subject } from './subject.entity';
class SubjectDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() semester!: number;
}
@Injectable()
export class SubjectsService {
  constructor(@InjectRepository(Subject) private readonly subjects: Repository<Subject>) {}
  listFor(user: User) {
    if (!user.course || user.semester === null)
      throw new ForbiddenException({
        code: 'ACADEMIC_PROFILE_REQUIRED',
        message: 'Esta conta não possui perfil de aluno.',
      });
    return this.subjects.find({
      where: {
        course: { id: user.course.id, active: true },
        semester: user.semester,
        active: true,
      },
      select: { id: true, name: true, semester: true },
      order: { name: 'ASC' },
    });
  }
}
@ApiTags('subjects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subjects')
class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}
  @Get()
  @ApiOkResponse({ type: [SubjectDto] })
  list(@CurrentUser() user: User) {
    return this.subjects.listFor(user);
  }
}
@Module({
  imports: [TypeOrmModule.forFeature([Subject])],
  providers: [SubjectsService],
  controllers: [SubjectsController],
  exports: [SubjectsService],
})
export class SubjectsModule {}
