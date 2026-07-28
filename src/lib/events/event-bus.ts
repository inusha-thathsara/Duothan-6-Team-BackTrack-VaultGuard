import { EventEmitter } from "events";

export type EventPayload = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
};

/**
 * In-process EventBus — Phase 2 analogue of Google Pub/Sub (Phase 1 §3.2).
 *
 * Events flow: Service → OutboxEvent table → Outbox Worker → EventBus → Consumers
 *
 * In Phase 3 (Fortify), this class swaps to real Pub/Sub with minimal changes
 * since the same EventPayload interface is preserved.
 *
 * Supported event types:
 *   - payment.completed  (FR-14a)
 *   - payment.failed
 *   - loan.repayment.completed
 *   - auth.login         (FR-17, Member 2)
 *   - auth.device_new    (FR-17, Member 2)
 *   - auth.mfa_change    (FR-17, Member 2)
 */
class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    // Allow many subscribers (audit, notifications, etc.)
    this.setMaxListeners(20);
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish an event to all subscribers.
   * Analogous to Pub/Sub topic.publish().
   */
  publish(event: EventPayload): void {
    console.log(
      `[EventBus] Publishing: ${event.eventType} (${event.eventId})`
    );
    this.emit(event.eventType, event);
    this.emit("*", event); // Wildcard — Audit Service subscribes to all
  }

  /**
   * Subscribe to a specific event type.
   * Analogous to Pub/Sub subscription.
   */
  subscribe(
    eventType: string,
    handler: (event: EventPayload) => Promise<void> | void
  ): void {
    console.log(`[EventBus] Subscriber registered for: ${eventType}`);
    this.on(eventType, (event: EventPayload) => {
      Promise.resolve(handler(event)).catch((err) => {
        console.error(
          `[EventBus] Handler error for ${eventType}:`,
          err
        );
      });
    });
  }

  /**
   * Subscribe to ALL events (wildcard).
   * Used by Audit Service to capture everything (FR-19).
   */
  subscribeAll(
    handler: (event: EventPayload) => Promise<void> | void
  ): void {
    console.log("[EventBus] Wildcard subscriber registered");
    this.on("*", (event: EventPayload) => {
      Promise.resolve(handler(event)).catch((err) => {
        console.error("[EventBus] Wildcard handler error:", err);
      });
    });
  }
}

export const eventBus = EventBus.getInstance();
