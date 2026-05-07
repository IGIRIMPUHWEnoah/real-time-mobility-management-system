import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { RideRequestDto } from './dto/ride-request.dto';

@Controller('rides')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('match')
  async requestMatch(
    @Body() rideRequestDto: RideRequestDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('x-idempotency-key header is required');
    }
    
    // In a full implementation, we would check the key in Redis/DB here.
    return await this.matchingService.findBestMatches(rideRequestDto);
  }
}
