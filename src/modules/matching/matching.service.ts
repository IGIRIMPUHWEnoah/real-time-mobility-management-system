import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { H3Service } from '../../infrastructure/h3.service';
import { MatchingEngine, DriverCandidate } from './matching.engine';
import { RideRequestDto } from './dto/ride-request.dto';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly h3Service: H3Service,
    private readonly matchingEngine: MatchingEngine,
  ) {}

  async findBestMatches(dto: RideRequestDto) {
    const { pickupLat, pickupLng } = dto;

    // 1. Identify Pickup Cell & Neighbors (kRing 1-3)
    const pickupCell = this.h3Service.getLatLngToCell(pickupLat, pickupLng);
    const cellsToSearch = this.h3Service.getNeighbors(pickupCell, 2); // Search 2 rings out

    // 2. Fetch Driver IDs from Redis H3 Sets
    const driverIds = new Set<string>();
    for (const cell of cellsToSearch) {
      const ids = await this.redisService.getClient().smembers(`h3:${cell}`);
      ids.forEach(id => driverIds.add(id));
    }

    if (driverIds.size === 0) {
      return { matches: [], message: 'No drivers found in your area' };
    }

    // 3. Hydrate Driver Metadata & Filter
    const candidates: DriverCandidate[] = [];
    for (const id of driverIds) {
      const meta = await this.redisService.getClient().hgetall(`driver:${id}:meta`);
      
      // Filter out stale or offline drivers
      if (!meta || meta.status === 'OFFLINE') continue;
      
      // Check staleness (10s limit)
      const lastUpdate = parseInt(meta.updated_at);
      if (Date.now() - lastUpdate > 10000) continue;

      candidates.push({
        id,
        lat: parseFloat(meta.lat),
        lng: parseFloat(meta.lng),
        rating: parseFloat(meta.rating || '5.0'),
        status: meta.status,
      });
    }

    // 4. Rank using the Pure Engine
    const matches = this.matchingEngine.rankDrivers(pickupLat, pickupLng, candidates);

    // 5. Store Match Proposal in Redis (30s TTL)
    // In a real app, we'd generate a unique rideId here
    const mockRideId = `ride_${Date.now()}`;
    await this.redisService.getClient().set(
      `match:${mockRideId}`,
      JSON.stringify({ matches, request: dto }),
      'EX', 30
    );

    return {
      rideId: mockRideId,
      matches,
    };
  }
}
