import {
  Check,
  Index,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '../courses/course.entity';
import { Role } from '../../common/enums/role.enum';
@Entity('users')
@Check('users_semester_check', 'semester >= 1')
@Check(
  'users_student_profile_check',
  "role <> 'STUDENT' OR (course_id IS NOT NULL AND semester IS NOT NULL)",
)
@Check('users_profile_pair_check', '(course_id IS NULL) = (semester IS NULL)')
@Index('users_course_idx', ['course'])
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 50, unique: true }) registration!: string;
  @Column({ length: 150 }) name!: string;
  @Column({ type: 'varchar', length: 254, nullable: true }) email!: string | null;
  @Column({ name: 'password_hash', select: false }) passwordHash!: string;
  @ManyToOne(() => Course, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id', foreignKeyConstraintName: 'users_course_id_fkey' })
  course!: Course | null;
  @Column({ type: 'integer', nullable: true }) semester!: number | null;
  @Column({ type: 'enum', enum: Role, enumName: 'user_role', default: Role.STUDENT }) role!: Role;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
