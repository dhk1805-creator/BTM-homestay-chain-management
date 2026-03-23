import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [GuestsController],
  providers: [GuestsService, PrismaService],
})
export class GuestsModule {}
