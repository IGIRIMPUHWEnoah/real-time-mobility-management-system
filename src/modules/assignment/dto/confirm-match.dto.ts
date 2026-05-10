import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMatchDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID of the driver to confirm' })
  @IsUUID()
  @IsNotEmpty()
  driverId: string;
}
