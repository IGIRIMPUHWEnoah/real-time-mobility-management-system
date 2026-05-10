import { Injectable, Module, Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Controller()
export class EventLoggerController {
  private readonly logger = new Logger(EventLoggerController.name);

  constructor(private readonly prisma: PrismaService) {}

  @EventPattern('driver.location.updated')
  async handleLocationUpdate(@Payload() payload: any) {
    // 1. Log to Event table (Audit log)
    await this.logEvent('DriverLocationUpdated', payload.driverId, payload);

    // 2. Persist to DriverLocation table (History)
    try {
      await this.prisma.driverLocation.create({
        data: {
          driverId: payload.driverId,
          lat: payload.lat,
          lng: payload.lng,
          heading: payload.heading,
          speedKmh: payload.speedKmh,
          h3CellR9: payload.h3Cell,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to persist location history: ${error.message}`);
    }
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
  controllers: [EventLoggerController],
  providers: [PrismaService],
})
export class EventsModule {}
