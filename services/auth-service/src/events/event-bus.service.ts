import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter } from 'events';

export interface AuthDomainEvent {
  eventType: string; // e.g. 'auth.login', 'auth.register', 'auth.mfa_change', 'auth.device_new', 'auth.logout'
  actor: string; // userId
  actorRole: string; // CUSTOMER | SUPPORT_OPERATOR
  resource: string; // 'user' | 'device' | 'session' | 'mfa_factor'
  resourceId?: string;
  metadata?: Record<string, any>;
  correlationId?: string;
  timestamp: string;
}

@Injectable()
export class EventBusService implements OnModuleInit {
  private readonly logger = new Logger(EventBusService.name);
  private readonly auditLogger = new Logger('AuditConsumer');
  private readonly emitter = new EventEmitter();

  onModuleInit() {
    // Automated Audit Consumer subscriber (FR-19)
    this.subscribe('*', (event: AuthDomainEvent) => {
      this.auditLogger.log(`[AUDIT_LOG] ${JSON.stringify(event)}`);
    });
  }

  emit(event: AuthDomainEvent): void {
    const fullPayload: AuthDomainEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      correlationId: event.correlationId || crypto.randomUUID(),
    };

    this.logger.log(`📢 [EventBus] Emitting event '${fullPayload.eventType}' for actor '${fullPayload.actor}'`);
    this.emitter.emit(fullPayload.eventType, fullPayload);
    this.emitter.emit('*', fullPayload);
  }

  subscribe(eventType: string, handler: (event: AuthDomainEvent) => void): void {
    this.emitter.on(eventType, handler);
  }
}
