import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}
  findById(id: string) {
    return this.users.findOne({ where: { id }, relations: { course: true } });
  }
  findForLogin(registration: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.course', 'course')
      .where('user.registration = :registration', { registration })
      .getOne();
  }
  create(
    data: Pick<User, 'name' | 'registration' | 'passwordHash' | 'course' | 'semester' | 'email'>,
  ) {
    return this.users.save(this.users.create(data));
  }
}
