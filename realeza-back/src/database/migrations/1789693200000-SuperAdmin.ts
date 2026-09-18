import { MigrationInterface, QueryRunner } from 'typeorm';
export class SuperAdmin1789693200000 implements MigrationInterface {
  name = 'SuperAdmin1789693200000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
      ALTER TABLE users ALTER COLUMN course_id DROP NOT NULL;
      ALTER TABLE users ALTER COLUMN semester DROP NOT NULL;
      ALTER TABLE users ADD CONSTRAINT users_student_profile_check CHECK (role <> 'STUDENT' OR (course_id IS NOT NULL AND semester IS NOT NULL));
      ALTER TABLE users ADD CONSTRAINT users_profile_pair_check CHECK ((course_id IS NULL) = (semester IS NULL));
    `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const rows: { total: string }[] = await queryRunner.query(
      "SELECT count(*) AS total FROM users WHERE role::text = 'SUPER_ADMIN' OR course_id IS NULL OR semester IS NULL",
    );
    if (Number(rows[0].total) > 0)
      throw new Error(
        'Rollback recusado: existem contas SUPER_ADMIN ou perfis administrativos sem curso/período. Resolva esses registros explicitamente antes de reverter.',
      );
    await queryRunner.query(`
      ALTER TABLE users DROP CONSTRAINT users_student_profile_check, DROP CONSTRAINT users_profile_pair_check;
      ALTER TABLE users ALTER COLUMN course_id SET NOT NULL, ALTER COLUMN semester SET NOT NULL;
      ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
      ALTER TYPE user_role RENAME TO user_role_old;
      CREATE TYPE user_role AS ENUM ('STUDENT', 'ADMIN');
      ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
      ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STUDENT';
      DROP TYPE user_role_old;
    `);
  }
}
