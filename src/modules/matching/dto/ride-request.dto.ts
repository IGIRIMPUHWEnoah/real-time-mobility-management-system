import { IsNumber, Min, Max, IsUUID, IsNotEmpty } from 'class-validator';

export class RideRequestDto {
  @IsUUID()
  @IsNotEmpty()
  passengerId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng: number;
}
