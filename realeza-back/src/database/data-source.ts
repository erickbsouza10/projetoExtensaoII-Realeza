import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Course } from '../modules/courses/course.entity';
import { User } from '../modules/users/user.entity';
import { Subject } from '../modules/subjects/subject.entity';
import { Question } from '../modules/questions/question.entity';
import { QuestionOption } from '../modules/questions/question-option.entity';
export function databaseOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    uuidExtension: 'pgcrypto',
    url,
    entities: [Course, User, Subject, Question, QuestionOption],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsRun: false,
  };
}
export default new DataSource(databaseOptions(process.env.DATABASE_URL ?? ''));
