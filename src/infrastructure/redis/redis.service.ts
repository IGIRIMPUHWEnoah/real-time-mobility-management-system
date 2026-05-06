import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  async onModuleInit() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  // Helper methods for mobility logic
  async updateDriverLocation(driverId: string, lat: number, lng: number, metadata: any) {
    const pipeline = this.client.pipeline();
    
    // 1. Update GeoSet
    pipeline.geoadd('drivers_geo', lng, lat, driverId);
    
    // 2. Update Metadata Hash
    pipeline.hset(`driver:${driverId}:meta`, {
      ...metadata,
      lat,
      lng,
      updated_at: Date.now(),
    });
    pipeline.expire(`driver:${driverId}:meta`, 60); // 60s TTL

    await pipeline.exec();
  }

  async updateH3Index(oldCell: string, newCell: string, driverId: string) {
    const pipeline = this.client.pipeline();
    if (oldCell && oldCell !== newCell) {
      pipeline.srem(`h3:${oldCell}`, driverId);
    }
    pipeline.sadd(`h3:${newCell}`, driverId);
    await pipeline.exec();
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const result = await this.client.set(key, 'locked', 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string) {
    await this.client.del(key);
  }
}
