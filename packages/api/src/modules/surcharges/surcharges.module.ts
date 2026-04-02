import { Module } from '@nestjs/common';
import { SurchargesController } from './surcharges.controller';
import { SurchargesService } from './surcharges.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [SurchargesController],
  providers: [SurchargesService, PrismaService],
  exports: [SurchargesService],
})
export class SurchargesModule {}
