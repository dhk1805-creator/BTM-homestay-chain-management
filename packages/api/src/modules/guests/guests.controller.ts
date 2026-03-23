import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GuestsService } from './guests.service';
import { PrismaService } from '../../common/prisma.service';
@ApiTags('Guests')
@Controller('guests')
export class GuestsController {
  constructor(private guestsService: GuestsService, private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List guests' })
  async findAll(@Query('limit') limit?: string) {
    return this.guestsService.findAll(limit ? parseInt(limit) : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get guest detail' })
  async findOne(@Param('id') id: string) {
    return this.guestsService.findOne(id);
  }
@Post()
  async create(@Body() data: any) {
    const org = await this.prisma.organization.findFirst();
    return this.prisma.guest.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        nationality: data.nationality || null,
        preferredLang: data.preferredLang || 'vi',
        orgId: org!.id,
      },
    });
  }
}