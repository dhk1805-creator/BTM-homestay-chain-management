import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PostStayService } from './post-stay.service';

@ApiTags('Post-Stay')
@Controller('post-stay')
export class PostStayController {
  constructor(private postStayService: PostStayService) {}

  @Post('trigger/:bookingId')
  @ApiOperation({ summary: 'Trigger post-stay jobs for a booking' })
  async trigger(@Param('bookingId') bookingId: string) {
    return this.postStayService.createPostStayJobs(bookingId);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get post-stay jobs' })
  async getJobs(@Query('bookingId') bookingId?: string) {
    return this.postStayService.getJobs(bookingId);
  }

  @Post('process')
  @ApiOperation({ summary: 'Process pending jobs now' })
  async processNow() {
    await this.postStayService.processJobs();
    return { message: 'Jobs processed' };
  }
}
