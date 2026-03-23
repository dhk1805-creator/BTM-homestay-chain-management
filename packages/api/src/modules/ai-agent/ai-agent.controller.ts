import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiAgentService } from './ai-agent.service';

@ApiTags('AI Agent')
@Controller('agent')
export class AiAgentController {
  constructor(private aiAgentService: AiAgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send message to AI Agent' })
  async chat(@Body() body: {
    message: string;
    bookingId?: string;
    guestId?: string;
    deviceType?: string;
    lang?: string;
  }) {
    return this.aiAgentService.chat(body);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversation history' })
  async getConversations(
    @Query('bookingId') bookingId?: string,
    @Query('guestId') guestId?: string,
  ) {
    return this.aiAgentService.getConversations(bookingId, guestId);
  }
}
