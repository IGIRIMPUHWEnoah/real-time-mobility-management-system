import { Injectable, Logger, ConflictException, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfirmMatchDto } from './dto/confirm-match.dto';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_SERVICE') private readonly client: ClientProxy,
  ) {}

  async confirmMatch(rideId: string, dto: ConfirmMatchDto) {
    const { driverId } = dto;
    const lockKey = `driver:lock:${driverId}`;

    // --- LAYER 1: Redis Distributed Lock ---
    const lockAcquired = await this.redisService.acquireLock(lockKey, 5000);
    if (!lockAcquired) {
      this.logger.warn(`Conflict: Driver ${driverId} lock already held`);
      throw new ConflictException('Driver is currently being assigned to another ride');
    }

    try {
      // --- LAYER 2: DB Transaction + Status Check ---
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Row-level lock on driver
        const driver = await tx.$queryRaw`
          SELECT id, status FROM drivers 
          WHERE id = ${driverId}::uuid 
          FOR UPDATE
        `;

        if (!driver || driver[0]?.status !== 'AVAILABLE') {
          throw new ConflictException('Driver is no longer available');
        }

        // 2. Update Driver status
        await tx.driver.update({
          where: { id: driverId },
          data: { status: 'ON_TRIP' },
        });

        // 3. Create Assignment record
        const assignment = await tx.assignment.create({
          data: {
            rideId,
            driverId,
            score: 1.0, // Mock score for now
            scoreBreakdown: {},
          },
        });

        // 4. Update Ride status
        await tx.ride.update({
          where: { id: rideId },
          data: { status: 'CONFIRMED' },
        });

        return assignment;
      });

      // Emit MatchConfirmed Event via Redis Pub/Sub
      this.client.emit('match.confirmed', {
        rideId,
        driverId,
        timestamp: new Date(),
      });

      return { success: true, assignmentId: result.id };

    } finally {
      // Always release the lock
      await this.redisService.releaseLock(lockKey);
    }
  }
}
