import { Injectable } from '@nestjs/common';

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
}

@Injectable()
export class DegradedService {
  private readonly serviceHealthMap = new Map<string, ServiceHealth>();

  constructor() {
    // Default initial health states
    this.serviceHealthMap.set('payments', {
      service: 'payments',
      status: 'healthy',
      lastChecked: new Date(),
    });
  }

  isServiceHealthy(serviceName: string): boolean {
    const health = this.serviceHealthMap.get(serviceName);
    return !health || health.status === 'healthy';
  }

  getDegradedServices(): string[] {
    return Array.from(this.serviceHealthMap.values())
      .filter((h) => h.status !== 'healthy')
      .map((h) => h.service);
  }

  setServiceStatus(service: string, status: 'healthy' | 'degraded' | 'down') {
    this.serviceHealthMap.set(service, {
      service,
      status,
      lastChecked: new Date(),
    });
  }
}
