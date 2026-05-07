import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { H3Service } from '../../infrastructure/h3.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'REDIS_SERVICE',
        transport: Transport.REDIS,
        options: { host: 'localhost', port: 6379 },
      },
    ]),
  ],
  controllers: [LocationController],
  providers: [LocationService, RedisService, H3Service],
  exports: [LocationService],
})
export class LocationModule {}
