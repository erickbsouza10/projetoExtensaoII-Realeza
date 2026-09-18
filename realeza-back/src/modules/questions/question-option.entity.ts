import {
  Check,
  Index,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Question } from './question.entity';
@Entity('question_options')
@Check('question_options_position_check', 'position >= 0')
@Index('question_options_one_correct_idx', ['question'], {
  unique: true,
  where: 'is_correct = true',
})
@Unique('question_options_question_position_key', ['question', 'position'])
export class QuestionOption {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => Question, (question) => question.options, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'question_id',
    foreignKeyConstraintName: 'question_options_question_id_fkey',
  })
  question!: Question;
  @Column({ type: 'text' }) text!: string;
  @Column({ type: 'integer' }) position!: number;
  @Column({ name: 'is_correct', select: false }) isCorrect!: boolean;
}
