import { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialSchema1789689600000 implements MigrationInterface {
  name = 'InitialSchema1789689600000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN');
      CREATE TYPE question_difficulty AS ENUM ('EASY', 'MEDIUM', 'HARD');
      CREATE TABLE courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(150) NOT NULL,
        code varchar(30) NOT NULL UNIQUE, total_semesters integer NOT NULL CHECK (total_semesters >= 1),
        active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration varchar(50) NOT NULL UNIQUE,
        name varchar(150) NOT NULL, email varchar(254), password_hash varchar NOT NULL,
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
        semester integer NOT NULL CHECK (semester >= 1), role user_role NOT NULL DEFAULT 'STUDENT',
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE subjects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(150) NOT NULL,
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
        semester integer NOT NULL CHECK (semester >= 1), active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT subjects_course_semester_name_key UNIQUE(course_id, semester, name)
      );
      CREATE TABLE questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
        semester integer NOT NULL CHECK (semester >= 1), difficulty question_difficulty NOT NULL,
        statement text NOT NULL, active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE question_options (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        text text NOT NULL, position integer NOT NULL CHECK (position >= 0), is_correct boolean NOT NULL,
        CONSTRAINT question_options_question_position_key UNIQUE(question_id, position)
      );
      CREATE INDEX questions_profile_difficulty_idx ON questions(course_id, semester, difficulty) WHERE active = true;
      CREATE UNIQUE INDEX question_options_one_correct_idx ON question_options(question_id) WHERE is_correct = true;
      CREATE INDEX users_course_idx ON users(course_id);
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP TABLE question_options, questions, subjects, users, courses; DROP TYPE question_difficulty, user_role;',
    );
  }
}
