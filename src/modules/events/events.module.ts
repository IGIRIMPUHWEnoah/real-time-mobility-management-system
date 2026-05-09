import { Injectable, Module, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class EventLoggerService {
  private readonly logger = new Logger(EventLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('driver.location.updated')
  async handleLocationUpdate(@Payload() payload: any) {
    await this.logEvent('DriverLocationUpdated', payload.driverId, payload);
  }

  @EventPattern('match.confirmed')
  async handleMatchConfirmed(@Payload() payload: any) {
    await this.logEvent('MatchConfirmed', payload.rideId, payload);
  }

  private async logEvent(type: string, aggregateId: string, payload: any) {
    try {
      await this.prisma.event.create({
        data: {
          eventType: type,
          aggregateId,
          payload,
        },
      });
      this.logger.debug(`Event logged: ${type} for ${aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to log event ${type}: ${error.message}`);
    }
  }
}

@Module({
  providers: [EventLoggerService, PrismaService],
})
export class EventsModule {}
