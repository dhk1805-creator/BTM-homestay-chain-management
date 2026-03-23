import { Module } from '@nestjs/common';
import { PostStayService } from './post-stay.service';
import { PostStayController } from './post-stay.controller';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [PostStayController],
  providers: [PostStayService, PrismaService],
  exports: [PostStayService],
})
export class PostStayModule {}
