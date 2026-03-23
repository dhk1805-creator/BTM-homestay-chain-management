import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const staff = await this.prisma.staff.findUnique({ where: { email } });
    if (!staff) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Support both bcrypt and sha256 (for seed data)
    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
    let valid = staff.password === sha256Hash;
    if (!valid) {
      try {
        valid = await bcrypt.compare(password, staff.password);
      } catch {
        valid = false;
      }
    }

    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = { sub: staff.id, email: staff.email, role: staff.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        buildingId: staff.buildingId,
      },
    };
  }

  async getProfile(userId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        buildingId: true, building: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });
    return staff;
  }
}
