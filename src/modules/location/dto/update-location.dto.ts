import { IsNumber, IsEnum, Min, Max, IsNotEmpty } from 'class-validator';

export enum DriverAvailability {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsNumber()
  @Min(0)
  @Max(360)
  heading: number;

  @IsNumber()
  @Min(0)
  speedKmh: number;

  @IsEnum(DriverAvailability)
  status: DriverAvailability;
}
