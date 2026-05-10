import { IsNumber, Min, Max, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RideRequestDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Unique ID of the passenger' })
  @IsUUID()
  @IsNotEmpty()
  passengerId: string;

  @ApiProperty({ example: -1.9441, description: 'Pickup Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat: number;

  @ApiProperty({ example: 30.0619, description: 'Pickup Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng: number;

  @ApiProperty({ example: -1.9500, description: 'Dropoff Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat: number;

  @ApiProperty({ example: 30.0700, description: 'Dropoff Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng: number;
}
