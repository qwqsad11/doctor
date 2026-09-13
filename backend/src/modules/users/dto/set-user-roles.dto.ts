import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn } from 'class-validator';

export const MANAGED_ROLES = ['admin', 'doctor', 'senior_doctor', 'consultation_expert'] as const;

export class SetUserRolesDto {
  @ApiProperty({ enum: MANAGED_ROLES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(MANAGED_ROLES, { each: true })
  roles: (typeof MANAGED_ROLES)[number][];
}
