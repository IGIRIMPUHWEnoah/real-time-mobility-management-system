import { IsUUID, IsNotEmpty } from 'class-validator';

export class ConfirmMatchDto {
  @IsUUID()
  @IsNotEmpty()
  driverId: string;
}
