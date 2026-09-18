import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('courses')
@Check('courses_total_semesters_check', 'total_semesters >= 1')
export class Course {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 150 }) name!: string;
  @Column({ length: 30, unique: true }) code!: string;
  @Column({ name: 'total_semesters', type: 'integer' }) totalSemesters!: number;
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
