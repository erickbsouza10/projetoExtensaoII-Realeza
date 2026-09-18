import { ApiProperty } from '@nestjs/swagger';
export class CourseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty() totalSemesters!: number;
}
