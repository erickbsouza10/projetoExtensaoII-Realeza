import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseDto } from '../courses/course.dto';
import { Role } from '../../common/enums/role.enum';
import { User } from './user.entity';
export class UserProfileDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() registration!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiProperty({ type: CourseDto, nullable: true }) course!: CourseDto | null;
  @ApiProperty({ type: Number, nullable: true }) semester!: number | null;
  @ApiProperty({ enum: Role }) role!: Role;
}
export function userProfile(user: User): UserProfileDto {
  return {
    id: user.id,
    registration: user.registration,
    name: user.name,
    email: user.email,
    semester: user.semester,
    role: user.role,
    course: user.course
      ? {
          id: user.course.id,
          name: user.course.name,
          code: user.course.code,
          totalSemesters: user.course.totalSemesters,
        }
      : null,
  };
}
