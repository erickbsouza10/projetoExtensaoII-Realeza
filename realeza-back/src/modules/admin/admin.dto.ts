import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Difficulty } from '../../common/enums/difficulty.enum';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const optional = (_object: unknown, value: unknown) => value !== undefined;
const booleanQuery = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;
export class CreateCourseDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(30) code!: string;
  @ApiProperty({ minimum: 1, maximum: 100 }) @IsInt() @Min(1) @Max(100) totalSemesters!: number;
  @ApiPropertyOptional({ default: true }) @ValidateIf(optional) @IsBoolean() active?: boolean;
}
export class UpdateCourseDto extends PartialType(CreateCourseDto, { skipNullProperties: false }) {}
export class CreateSubjectDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() courseId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) semester!: number;
  @ApiPropertyOptional({ default: true }) @ValidateIf(optional) @IsBoolean() active?: boolean;
}
export class UpdateSubjectDto extends PartialType(CreateSubjectDto, {
  skipNullProperties: false,
}) {}
export class OptionInputDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(2000) text!: string;
  @ApiProperty() @IsBoolean() isCorrect!: boolean;
}
@ValidatorConstraint({ name: 'oneCorrectAnswer', async: false })
class OneCorrectAnswer implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return (
      Array.isArray(value) &&
      value.filter((option) => option && option.isCorrect === true).length === 1
    );
  }
  defaultMessage() {
    return 'A questão deve ter exatamente uma alternativa correta.';
  }
}
export class CreateQuestionDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() courseId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) semester!: number;
  @ApiProperty({ format: 'uuid' }) @IsUUID() subjectId!: string;
  @ApiProperty({ enum: Difficulty }) @IsEnum(Difficulty) difficulty!: Difficulty;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(10000) statement!: string;
  @ApiProperty({ type: [OptionInputDto], minItems: 4, maxItems: 4 })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OptionInputDto)
  @Validate(OneCorrectAnswer)
  options!: OptionInputDto[];
  @ApiPropertyOptional({ default: true }) @ValidateIf(optional) @IsBoolean() active?: boolean;
}
export class UpdateQuestionDto extends PartialType(CreateQuestionDto, {
  skipNullProperties: false,
}) {}
export class QuestionStatusDto {
  @ApiProperty() @IsBoolean() active!: boolean;
}
export class AdminQuestionQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @ValidateIf(optional) @IsUUID() courseId?: string;
  @ApiPropertyOptional({ minimum: 1 })
  @ValidateIf(optional)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semester?: number;
  @ApiPropertyOptional({ format: 'uuid' }) @ValidateIf(optional) @IsUUID() subjectId?: string;
  @ApiPropertyOptional({ enum: Difficulty })
  @ValidateIf(optional)
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
  @ApiPropertyOptional()
  @ValidateIf(optional)
  @Transform(booleanQuery)
  @IsBoolean()
  active?: boolean;
  @ApiPropertyOptional({ default: 1 }) @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class AdminSubjectQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @ValidateIf(optional) @IsUUID() courseId?: string;
  @ApiPropertyOptional({ minimum: 1 })
  @ValidateIf(optional)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  semester?: number;
  @ApiPropertyOptional()
  @ValidateIf(optional)
  @Transform(booleanQuery)
  @IsBoolean()
  active?: boolean;
}
export class AdminCourseDto extends CreateCourseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() declare active: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
export class AdminSubjectDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: AdminCourseDto }) course!: AdminCourseDto;
  @ApiProperty() semester!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
export class AdminOptionDto extends OptionInputDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() position!: number;
}
export class AdminQuestionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ type: AdminCourseDto }) course!: AdminCourseDto;
  @ApiProperty({ type: AdminSubjectDto }) subject!: AdminSubjectDto;
  @ApiProperty() semester!: number;
  @ApiProperty({ enum: Difficulty }) difficulty!: Difficulty;
  @ApiProperty() statement!: string;
  @ApiProperty() active!: boolean;
  @ApiProperty({ type: [AdminOptionDto] }) options!: AdminOptionDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
export class AdminQuestionPageDto {
  @ApiProperty({ type: [AdminQuestionDto] }) data!: AdminQuestionDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
export class AdminStatsDto {
  @ApiProperty() courses!: number;
  @ApiProperty() subjects!: number;
  @ApiProperty() questions!: number;
}
