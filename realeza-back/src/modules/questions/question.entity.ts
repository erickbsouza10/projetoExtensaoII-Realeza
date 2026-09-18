import {
  Check,
  Index,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '../courses/course.entity';
import { Subject } from '../subjects/subject.entity';
import { Difficulty } from '../../common/enums/difficulty.enum';
import { QuestionOption } from './question-option.entity';
@Entity('questions')
@Check('questions_semester_check', 'semester >= 1')
@Index('questions_profile_difficulty_idx', ['course', 'semester', 'difficulty'], {
  where: 'active = true',
})
export class Question {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Subject, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id', foreignKeyConstraintName: 'questions_subject_id_fkey' })
  subject!: Subject;
  @ManyToOne(() => Course, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id', foreignKeyConstraintName: 'questions_course_id_fkey' })
  course!: Course;
  @Column({ type: 'integer' }) semester!: number;
  @Column({ type: 'enum', enum: Difficulty, enumName: 'question_difficulty' })
  difficulty!: Difficulty;
  @Column({ type: 'text' }) statement!: string;
  @Column({ default: true }) active!: boolean;
  @OneToMany(() => QuestionOption, (option) => option.question) options!: QuestionOption[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
