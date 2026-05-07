import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { H3Service } from '../../infrastructure/h3.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly h3Service: H3Service,
    @Inject('REDIS_SERVICE') private readonly client: ClientProxy,
  ) {}

  async updateLocation(driverId: string, dto: UpdateLocationDto) {
    const { lat, lng, status } = dto;

    // 1. Compute H3 Cell
    const newCell = this.h3Service.getLatLngToCell(lat, lng);
    
    // 2. Get old cell from Redis to handle index cleanup
    const driverMetaKey = `driver:${driverId}:meta`;
    const oldMeta = await this.redisService.getClient().hgetall(driverMetaKey);
    const oldCell = oldMeta?.h3_cell;

    // 3. Update Redis Hot Layer (GeoSet + Metadata)
    await this.redisService.updateDriverLocation(driverId, lat, lng, {
      ...dto,
      h3_cell: newCell,
    });

    // 4. Update H3 Spatial Index (Remove from old cell, add to new)
    if (oldCell !== newCell) {
      await this.redisService.updateH3Index(oldCell, newCell, driverId);
    }

    // 5. Emit Event via Redis Pub/Sub
    this.client.emit('driver.location.updated', {
      driverId,
      ...dto,
      h3Cell: newCell,
      timestamp: new Date(),
    });

    this.logger.debug(`Location updated for driver ${driverId} in cell ${newCell}`);
    
    return { success: true, cell: newCell };
  }
}
