import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LocationModule } from './modules/location/location.module';
import { MatchingModule } from './modules/matching/matching.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { EventsModule } from './modules/events/events.module';
import { PrismaService } from './infrastructure/prisma/prisma.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(), // Keep for local internal events if needed
    ClientsModule.register([
      {
        name: 'REDIS_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
        },
      },
    ]),
    LocationModule,
    MatchingModule,
    AssignmentModule,
    EventsModule,
  ],
  controllers: [],
  providers: [PrismaService],
  exports: [ClientsModule],
})
export class AppModule {}
