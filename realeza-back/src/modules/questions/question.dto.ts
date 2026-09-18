import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Difficulty } from '../../common/enums/difficulty.enum';
export class QuestionQueryDto {
  @ApiProperty({ enum: Difficulty }) @IsEnum(Difficulty) difficulty!: Difficulty;
}
class QuestionOptionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() text!: string;
  @ApiProperty() position!: number;
}
class QuestionSubjectDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}
export class QuestionDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() statement!: string;
  @ApiProperty({ enum: Difficulty }) difficulty!: Difficulty;
  @ApiProperty({ type: QuestionSubjectDto }) subject!: QuestionSubjectDto;
  @ApiProperty({ type: [QuestionOptionDto] }) options!: QuestionOptionDto[];
}
