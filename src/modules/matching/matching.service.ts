import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MatchingEngine } from './matching.engine';
import { RideRequestDto } from './dto/ride-request.dto';
import { gridDisk, latLngToCell } from 'h3-js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly matchingEngine: MatchingEngine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findBestMatches(dto: RideRequestDto, idempotencyKey: string) {
    const { pickupLat, pickupLng, passengerId } = dto;
    const centerCell = latLngToCell(pickupLat, pickupLng, 9);
    const cellsToScan = gridDisk(centerCell, 1);

    const driverIds = new Set<string>();
    for (const cell of cellsToScan) {
      const ids = await this.redisService.getClient().smembers(`cell:${cell}:drivers`);
      ids.forEach((id) => driverIds.add(id));
    }

    const candidates: any[] = [];
    for (const id of driverIds) {
      const meta = await this.redisService.getClient().hgetall(`driver:${id}:meta`);
      
      if (!meta || meta.status === 'OFFLINE' || meta.status === 'ON-TRIP') continue;
      
      const lastUpdate = parseInt(meta.updated_at);
      if (Date.now() - lastUpdate > 10000) continue;

      candidates.push({
        id,
        lat: parseFloat(meta.lat),
        lng: parseFloat(meta.lng),
        status: meta.status,
        rating: 4.5,
      });
    }

    const rankedMatches = this.matchingEngine.rankDrivers(pickupLat, pickupLng, candidates);

    const ride = await this.prisma.ride.create({
      data: {
        passengerId,
        pickupLat,
        pickupLng,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        status: 'REQUESTED',
        idempotencyKey,
      },
    });

    this.eventEmitter.emit('ride.requested', { rideId: ride.id, passengerId, timestamp: new Date() });

    return {
      rideId: ride.id,
      matches: rankedMatches,
    };
  }
}
