import { IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  ON_TRIP = 'ON-TRIP',
  OFFLINE = 'OFFLINE',
}

export class UpdateLocationDto {
  @ApiProperty({ example: -1.9441, description: 'Current Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 30.0619, description: 'Current Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiProperty({ example: 90, description: 'Compass heading (0-360)' })
  @IsNumber()
  @Min(0)
  @Max(360)
  heading: number;

  @ApiProperty({ example: 45.5, description: 'Speed in km/h' })
  @IsNumber()
  @Min(0)
  speedKmh: number;

  @ApiProperty({ enum: DriverStatus, example: DriverStatus.AVAILABLE, description: 'Current driver status' })
  @IsEnum(DriverStatus)
  status: DriverStatus;
}
