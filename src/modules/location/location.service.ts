import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { latLngToCell } from 'h3-js';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async updateLocation(driverId: string, dto: UpdateLocationDto) {
    const { lat, lng, status } = dto;
    const h3Cell = latLngToCell(lat, lng, 9);

    const oldMeta = await this.redisService.getClient().hgetall(`driver:${driverId}:meta`);
    const oldCell = oldMeta?.h3_cell;

    const currentStatus = oldMeta?.status;
    const finalStatus = (currentStatus === 'ON-TRIP') ? currentStatus : status;

    await this.redisService.updateDriverLocation(driverId, lat, lng, {
      ...dto,
      status: finalStatus,
      h3_cell: h3Cell,
      updated_at: Date.now().toString(),
    });

    if (oldCell && oldCell !== h3Cell) {
      await this.redisService.getClient().srem(`cell:${oldCell}:drivers`, driverId);
    }
    await this.redisService.getClient().sadd(`cell:${h3Cell}:drivers`, driverId);

    this.eventEmitter.emit('driver.location_updated', {
      driverId,
      ...dto,
      h3Cell,
      timestamp: new Date(),
    });

    return { success: true, h3Cell };
  }
}
