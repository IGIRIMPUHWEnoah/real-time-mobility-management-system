import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { ConfirmMatchDto } from './dto/confirm-match.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async confirmMatch(rideId: string, dto: ConfirmMatchDto) {
    const { driverId } = dto;
    const lockKey = `lock:driver:${driverId}`;

    const acquired = await this.redisService.getClient().set(lockKey, 'LOCKED', 'PX', 5000, 'NX');
    if (!acquired) {
      throw new ConflictException('Driver is currently being processed by another request');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const ride = await tx.ride.findUnique({ where: { id: rideId } });
        if (!ride) throw new NotFoundException('Ride not found');
        if (ride.status !== 'REQUESTED') throw new ConflictException('Ride is no longer in REQUESTED state');

        const driver = await tx.driver.findUnique({ where: { id: driverId } });
        if (!driver || driver.status !== 'AVAILABLE') {
          throw new ConflictException('Driver is no longer available');
        }

        await tx.driver.update({
          where: { id: driverId },
          data: { status: 'ON_TRIP' },
        });

        const assignment = await tx.assignment.create({
          data: {
            rideId,
            driverId,
            score: 1.0,
            scoreBreakdown: {},
          },
        });

        await tx.ride.update({
          where: { id: rideId },
          data: { status: 'CONFIRMED' },
        });

        await this.redisService.getClient().hset(`driver:${driverId}:meta`, 'status', 'ON-TRIP');

        this.eventEmitter.emit('match.confirmed', { rideId, driverId, timestamp: new Date() });

        return assignment;
      });
    } finally {
      await this.redisService.getClient().del(lockKey);
    }
  }
}
