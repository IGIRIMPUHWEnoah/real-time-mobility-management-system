import { Module } from '@nestjs/common';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingEngine } from './matching.engine';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { H3Service } from '../../infrastructure/h3.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Module({
  controllers: [MatchingController],
  providers: [MatchingService, MatchingEngine, RedisService, H3Service, PrismaService],
  exports: [MatchingService],
})
export class MatchingModule {}
