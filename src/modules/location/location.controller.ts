import { Controller, Post, Body, Param, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Location')
@Controller('drivers')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post(':id/location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver real-time location', description: 'Updates Redis spatial index and emits a location update event.' })
  @ApiParam({ name: 'id', description: 'The UUID of the Driver' })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return await this.locationService.updateLocation(id, updateLocationDto);
  }
}
