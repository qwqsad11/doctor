import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTempPermissionDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: ['consultation'] })
  @IsIn(['consultation'])
  resourceType: 'consultation';

  @ApiProperty()
  @IsUUID()
  resourceId: string;

  @ApiProperty({ enum: ['view'] })
  @IsIn(['view'])
  permissionType: 'view';

  @ApiProperty()
  @IsDateString()
  expiresAt: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
