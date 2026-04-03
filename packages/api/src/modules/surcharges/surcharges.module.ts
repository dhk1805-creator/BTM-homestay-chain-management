import { Module } from '@nestjs/common';
import { SurchargesController } from './surcharges.controller';
import { SurchargesService } from './surcharges.service';

@Module({
  controllers: [SurchargesController],
  providers: [SurchargesService],
  exports: [SurchargesService],
})
export class SurchargesModule {}
