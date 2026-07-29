import { prisma } from "@/lib/db/prisma";
import { eventBus } from "@/lib/events/event-bus";
import type { EventPayload } from "@/lib/events/event-bus";
import { logger } from "@/lib/logger/logger";

export interface CreateAuditInput {
  eventId?: string;
  actor: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  ipAddress?: string;
}

export class AuditService {
  private static instance: AuditService;
  private isSubscribed = false;

  private constructor() {}

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  /**
   * Initializes wildcard listener on EventBus (FR-19).
   */
  initConsumer(): void {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    logger.info("[AuditService] Subscribing to wildcard event bus topic...");

    eventBus.subscribeAll(async (event: EventPayload) => {
      await this.handleEvent(event);
    });
  }

  /**
   * Processes event from EventBus, deduplicating by eventId.
   */
  async handleEvent(event: EventPayload): Promise<void> {
    try {
      // Check deduplication (FR-14b, FR-19)
      const existing = await prisma.auditEvent.findUnique({
        where: { eventId: event.eventId },
      });

      if (existing) {
        logger.debug(
          `[AuditService] Duplicate event skipped: ${event.eventId}`
        );
        return;
      }

      const payload = event.payload || {};
      const actor = (payload.userId as string) || (payload.actor as string) || "SYSTEM";
      const actorRole = (payload.actorRole as string) || "SYSTEM";
      const resource = (payload.resource as string) || event.eventType.split(".")[0] || "system";
      const resourceId = (payload.resourceId as string) || (payload.transactionId as string) || (payload.id as string) || undefined;

      await this.recordAuditEvent({
        eventId: event.eventId,
        actor,
        actorRole,
        action: event.eventType,
        resource,
        resourceId,
        metadata: payload,
        correlationId: event.correlationId,
        ipAddress: payload.ipAddress as string | undefined,
      });
    } catch (error) {
      logger.error(`[AuditService] Failed to process event ${event.eventId}`, error);
    }
  }

  /**
   * Directly writes an immutable AuditEvent to the database.
   */
  async recordAuditEvent(input: CreateAuditInput) {
    const eventId = input.eventId || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const entry = await prisma.auditEvent.create({
        data: {
          eventId,
          actor: input.actor,
          actorRole: input.actorRole,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: input.metadata ? (input.metadata as object) : undefined,
          correlationId: input.correlationId,
          ipAddress: input.ipAddress,
        },
      });

      logger.info(`[AuditService] Recorded audit entry: ${entry.action} by ${entry.actor}`, {
        auditId: entry.id,
        action: entry.action,
        actor: entry.actor,
      });

      return entry;
    } catch (error) {
      // Handles duplicate eventId gracefully if race condition occurs
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002"
      ) {
        logger.warn(`[AuditService] Duplicate eventId ignored: ${eventId}`);
        return null;
      }
      logger.error("[AuditService] Error recording audit event", error);
      throw error;
    }
  }

  /**
   * Retrieves security timeline for a user (FR-18).
   */
  async getUserAuditLogs(userId: string, limit = 50, offset = 0) {
    const [logs, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where: { actor: userId },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditEvent.count({
        where: { actor: userId },
      }),
    ]);

    return { logs, total, limit, offset };
  }
}

export const auditService = AuditService.getInstance();
