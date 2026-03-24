import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
    let valid = staff.password === sha256Hash;
    if (!valid) {
      try { valid = await bcrypt.compare(password, staff.password); } catch { valid = false; }
    }
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = { sub: staff.id, email: staff.email, role: staff.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken, refreshToken,
      user: { id: staff.id, name: staff.name, email: staff.email, role: staff.role, buildingId: staff.buildingId },
    };
  }

  async getProfile(userId: string) {
    return this.prisma.staff.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        buildingId: true, building: { select: { name: true } },
        organization: { select: { name: true } },
      },
    });
  }

  async register(data: { name: string; email: string; password: string; role: string; buildingId?: string }) {
    const existing = await this.prisma.staff.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email đã tồn tại');
    if (data.password.length < 6) throw new BadRequestException('Mật khẩu phải >= 6 ký tự');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new BadRequestException('Chưa có organization');

    // If buildingId not provided, get first building
    let buildingId = data.buildingId || null;
    if (!buildingId) {
      const bld = await this.prisma.building.findFirst({ where: { active: true } });
      if (bld) buildingId = bld.id;
    }

    const staff = await this.prisma.staff.create({
      data: {
        name: data.name, email: data.email, password: hashedPassword,
        role: data.role as any, orgId: org.id, buildingId, active: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return { message: 'Tạo user thành công', user: staff };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: userId } });
    if (!staff) throw new BadRequestException('User không tồn tại');

    const sha256Hash = crypto.createHash('sha256').update(oldPassword).digest('hex');
    let valid = staff.password === sha256Hash;
    if (!valid) {
      try { valid = await bcrypt.compare(oldPassword, staff.password); } catch { valid = false; }
    }
    if (!valid) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    if (newPassword.length < 6) throw new BadRequestException('Mật khẩu mới phải >= 6 ký tự');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.staff.update({ where: { id: userId }, data: { password: hashed } });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async resetPassword(staffId: string, newPassword: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new BadRequestException('User không tồn tại');
    if (newPassword.length < 6) throw new BadRequestException('Mật khẩu mới phải >= 6 ký tự');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.staff.update({ where: { id: staffId }, data: { password: hashed } });
    return { message: `Đã đổi mật khẩu cho ${staff.name}` };
  }
}
