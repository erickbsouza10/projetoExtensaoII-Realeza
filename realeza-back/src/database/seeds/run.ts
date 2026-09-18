import dataSource from '../data-source';
import seedQuestions from './questions.json';
import { Course } from '../../modules/courses/course.entity';
import { Subject } from '../../modules/subjects/subject.entity';
import { Question } from '../../modules/questions/question.entity';
import { QuestionOption } from '../../modules/questions/question-option.entity';
import { Difficulty } from '../../common/enums/difficulty.enum';
interface SeedQuestion {
  id: number;
  course: string;
  semester: number;
  subject: string;
  difficulty: Difficulty;
  statement: string;
  options: string[];
  correct: number;
}
const questions = seedQuestions as SeedQuestion[];
async function seed() {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      // Serialize concurrent seed executions; repeated runs do not overwrite existing catalog changes.
      await manager.query('SELECT pg_advisory_xact_lock(1789689600)');
      const originalIds = questions.map(
        (item) => `00000000-0000-4000-8000-${String(item.id).padStart(12, '0')}`,
      );
      const existing: { total: string }[] = await manager.query(
        'SELECT count(*) AS total FROM questions WHERE id = ANY($1::uuid[])',
        [originalIds],
      );
      // Administration may rename/move seeded records. Do not recreate their old names on a later seed run.
      if (Number(existing[0].total) === originalIds.length) return;
      for (const record of [
        {
          name: 'Análise e Desenvolvimento de Sistemas',
          code: 'ADS',
          totalSemesters: 5,
          active: true,
        },
        // Preserve the Direito question without assuming a verified curriculum for public registration.
        { name: 'Direito', code: 'Direito', totalSemesters: 1, active: false },
      ]) {
        if (!(await manager.findOneBy(Course, { code: record.code })))
          await manager.save(Course, manager.create(Course, record));
      }
      for (const item of questions) {
        const course = await manager.findOneByOrFail(Course, { code: item.course });
        let subject = await manager.findOne(Subject, {
          where: { name: item.subject, course: { id: course.id }, semester: item.semester },
        });
        if (!subject)
          subject = await manager.save(
            Subject,
            manager.create(Subject, { name: item.subject, course, semester: item.semester }),
          );
        const id = `00000000-0000-4000-8000-${String(item.id).padStart(12, '0')}`;
        if (await manager.existsBy(Question, { id })) continue;
        if (item.correct < 0 || item.correct >= item.options.length)
          throw new Error('Seed contém alternativa correta inválida.');
        const question = await manager.save(
          Question,
          manager.create(Question, {
            id,
            subject,
            course,
            semester: item.semester,
            difficulty: item.difficulty,
            statement: item.statement,
          }),
        );
        await manager.save(
          QuestionOption,
          item.options.map((text, position) =>
            manager.create(QuestionOption, {
              question,
              text,
              position,
              isCorrect: position === item.correct,
            }),
          ),
        );
      }
    });
    console.log(
      'Seed concluído. Catálogo inicial disponível; alterações administrativas existentes foram preservadas.',
    );
  } finally {
    await dataSource.destroy();
  }
}
void seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
