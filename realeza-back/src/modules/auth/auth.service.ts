import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { hashPassword } from './password';
import { Course } from '../courses/course.entity';
import { Role } from '../../common/enums/role.enum';
import { DataSource, QueryFailedError } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { userProfile } from '../users/user-profile.dto';
import { LoginDto, RegisterDto } from './auth.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly database: DataSource,
  ) {}
  private async session(user: User) {
    return { accessToken: await this.jwt.signAsync({ sub: user.id }), user: userProfile(user) };
  }
  async login(dto: LoginDto) {
    const user = await this.users.findForLogin(dto.registration);
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_REGISTERED',
        message: 'Matrícula não cadastrada.',
      });
    if (!(await compare(dto.password, user.passwordHash)))
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Matrícula ou senha inválida.',
      });
    return this.session(user);
  }
  async register(dto: RegisterDto) {
    const passwordHash = await hashPassword(dto.password);
    try {
      const user = await this.database.transaction(async (manager) => {
        const course = await manager.findOne(Course, {
          where: { id: dto.courseId, active: true },
          lock: { mode: 'pessimistic_read' },
        });
        if (!course)
          throw new BadRequestException({
            code: 'INVALID_COURSE',
            message: 'Curso inexistente ou inativo.',
          });
        if (dto.semester > course.totalSemesters)
          throw new BadRequestException({
            code: 'INVALID_SEMESTER',
            message: 'Período fora dos limites do curso.',
          });
        return manager.save(
          User,
          manager.create(User, {
            registration: dto.registration,
            name: dto.name,
            email: dto.email ?? null,
            passwordHash,
            course,
            semester: dto.semester,
            role: Role.STUDENT,
          }),
        );
      });
      return this.session(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      )
        throw new ConflictException({
          code: 'REGISTRATION_ALREADY_EXISTS',
          message: 'Esta matrícula já está cadastrada.',
        });
      throw error;
    }
  }
}
