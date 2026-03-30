import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Staff login' })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Post('register')
  @ApiOperation({ summary: 'Create new staff user' })
  async register(@Body() body: { name: string; email: string; password: string; role: string; buildingId?: string }) {
    return this.authService.register(body);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(@Request() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password for a staff member' })
  async resetPassword(@Body() body: { staffId: string; newPassword: string }) {
    return this.authService.resetPassword(body.staffId, body.newPassword);
  }

  @Post('delete-user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a staff user' })
  async deleteUser(@Request() req: any, @Body() body: { staffId: string }) {
    return this.authService.deleteUser(req.user.sub, body.staffId);
  }

  @Post('reset-system')
  @ApiOperation({ summary: 'Reset all operational data (bookings, guests, incidents, reviews)' })
  async resetSystem() {
    return this.authService.resetSystem();
  }
}
