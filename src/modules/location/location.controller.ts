import { Controller, Post, Body, Param, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { LocationService } from './location.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Controller('drivers')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post(':id/location')
  @HttpCode(HttpStatus.OK)
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return await this.locationService.updateLocation(id, updateLocationDto);
  }
}
