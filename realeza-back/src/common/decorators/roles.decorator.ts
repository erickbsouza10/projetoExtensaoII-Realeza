import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';
export const ROLES_KEY = 'realeza.roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
