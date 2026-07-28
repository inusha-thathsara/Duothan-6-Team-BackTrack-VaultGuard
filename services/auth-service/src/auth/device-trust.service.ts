import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class DeviceTrustService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a deterministic fingerprint from User-Agent and IP prefix.
   */
  createFingerprint(userAgent: string = 'unknown', ip: string = '127.0.0.1'): { fingerprint: string; ipHash: string } {
    // Extract IP subnet/prefix (e.g. 192.168.1.x -> 192.168.1)
    const ipPrefix = ip.split('.').slice(0, 3).join('.');
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
    const fingerprint = crypto.createHash('sha256').update(`${userAgent}:${ipPrefix}`).digest('hex');

    return { fingerprint, ipHash };
  }

  /**
   * Check if a device fingerprint is trusted for a user.
   */
  async isTrustedDevice(userId: string, fingerprint: string): Promise<boolean> {
    const device = await this.prisma.trustedDevice.findFirst({
      where: {
        userId,
        fingerprint,
      },
    });

    return !!device;
  }

  /**
   * Register or update a device as trusted for a user.
   */
  async registerDevice(userId: string, userAgent: string, ip: string, label?: string) {
    const { fingerprint, ipHash } = this.createFingerprint(userAgent, ip);
    const deviceLabel = label || this.deriveLabelFromUserAgent(userAgent);

    const existingDevice = await this.prisma.trustedDevice.findFirst({
      where: { userId, fingerprint },
    });

    if (existingDevice) {
      return this.prisma.trustedDevice.update({
        where: { id: existingDevice.id },
        data: {
          trustedAt: new Date(),
          userAgent,
          ipHash,
          label: deviceLabel,
        },
      });
    }

    return this.prisma.trustedDevice.create({
      data: {
        userId,
        fingerprint,
        userAgent,
        ipHash,
        label: deviceLabel,
      },
    });
  }

  /**
   * List all trusted devices for a user.
   */
  async listDevices(userId: string, currentFingerprint?: string) {
    const devices = await this.prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { trustedAt: 'desc' },
    });

    return devices.map((d) => ({
      id: d.id,
      label: d.label || 'Unknown Device',
      fingerprint: d.fingerprint,
      trustedAt: d.trustedAt.toISOString(),
      isCurrent: currentFingerprint ? d.fingerprint === currentFingerprint : false,
    }));
  }

  /**
   * Revoke a trusted device.
   */
  async revokeDevice(userId: string, deviceId: string): Promise<boolean> {
    const device = await this.prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: 'Trusted device not found or access denied.',
          details: null,
        },
      });
    }

    await this.prisma.trustedDevice.delete({
      where: { id: deviceId },
    });

    return true;
  }

  private deriveLabelFromUserAgent(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Postman')) return 'Postman API Client';
    return 'Web Browser';
  }
}
