import { Module } from '@nestjs/common';
import { PostStayService } from './post-stay.service';
import { PostStayController } from './post-stay.controller';

@Module({
  controllers: [PostStayController],
  providers: [PostStayService],
  exports: [PostStayService],
})
export class PostStayModule {}
