import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { RideRequestDto } from './dto/ride-request.dto';

@ApiTags('Matching')
@Controller('rides')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('match')
  @ApiOperation({ summary: 'Find top 3 available drivers', description: 'Uses H3 spatial indexing to rank the best drivers for a passenger.' })
  @ApiHeader({ name: 'x-idempotency-key', required: true, description: 'Unique key to prevent duplicate match requests' })
  async requestMatch(
    @Body() rideRequestDto: RideRequestDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('x-idempotency-key header is required');
    }
    
    // In a full implementation, we would check the key in Redis/DB here.
    return await this.matchingService.findBestMatches(rideRequestDto, idempotencyKey);
  }
}
