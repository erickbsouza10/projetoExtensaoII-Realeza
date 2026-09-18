import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { UserProfileDto } from '../users/user-profile.dto';
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
@ValidatorConstraint({ name: 'bcryptPasswordLength', async: false })
class BcryptPasswordLength implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72;
  }
  defaultMessage() {
    return 'A senha deve ter no máximo 72 bytes UTF-8.';
  }
}
export class LoginDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(50) registration!: string;
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  @Validate(BcryptPasswordLength)
  password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 8, maxLength: 72, format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  @Validate(BcryptPasswordLength)
  declare password: string;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() courseId!: string;
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) semester!: number;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(254) email?: string;
}
export class AuthSessionDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: UserProfileDto }) user!: UserProfileDto;
}
