import { prisma } from "@/lib/db/prisma";
import { eventBus } from "./event-bus";
import type { EventPayload } from "./event-bus";

const MAX_RETRIES = Number(process.env.OUTBOX_MAX_RETRIES) || 3;
const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS) || 5000;
const BATCH_SIZE = Number(process.env.OUTBOX_BATCH_SIZE) || 10;

const globalForWorker = globalThis as unknown as {
  outboxWorkerInterval: ReturnType<typeof setInterval> | undefined;
};

/**
 * Outbox Worker — Transactional Outbox pattern (FR-14a, FR-14b, §3.3).
 *
 * Flow:
 *   1. Poll outbox_events WHERE processed = false
 *   2. For each event, publish to EventBus
 *   3. Mark as processed on success
 *   4. Increment retryCount on failure
 *   5. After MAX_RETRIES, move to dead_letter_entries (DLQ)
 *
 * In Phase 3, this swaps to a Cloud Function reading the same outbox table
 * and publishing to real Pub/Sub.
 */
async function processOutboxBatch(): Promise<void> {
  try {
    const events = await prisma.outboxEvent.findMany({
      where: {
        processed: false,
        retryCount: { lt: MAX_RETRIES },
      },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    if (events.length === 0) return;

    console.log(`[OutboxWorker] Processing ${events.length} event(s)...`);

    for (const event of events) {
      try {
        const eventPayload: EventPayload = {
          eventId: event.id,
          eventType: event.eventType,
          payload: event.payload as Record<string, unknown>,
          timestamp: event.createdAt.toISOString(),
          correlationId: (event.payload as Record<string, unknown>)
            ?.correlationId as string | undefined,
        };

        // Publish to EventBus (Pub/Sub analogue)
        eventBus.publish(eventPayload);

        // Phase 3 GCP Pub/Sub integration
        if (process.env.USE_PUBSUB === "true") {
          const { publishToPubSub } = await import("./pubsub-adapter");
          const topicName = process.env.PUBSUB_TOPIC || "vaultguard-events";
          const success = await publishToPubSub(topicName, eventPayload);
          if (!success) {
            throw new Error("Failed to publish event to GCP Pub/Sub adapter");
          }
        }

        // Mark as processed
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processed: true, processedAt: new Date() },
        });

        console.log(
          `[OutboxWorker] ✓ Processed: ${event.eventType} (${event.id})`
        );
      } catch (error) {
        console.error(
          `[OutboxWorker] ✗ Failed event ${event.id}:`,
          error instanceof Error ? error.message : error
        );

        const newRetryCount = event.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          // Move to Dead Letter Queue (FR-14b)
          console.warn(
            `[OutboxWorker] → DLQ: event ${event.id} after ${MAX_RETRIES} retries`
          );

          await prisma.$transaction([
            prisma.deadLetterEntry.create({
              data: {
                originalEventId: event.id,
                eventType: event.eventType,
                payload: event.payload as object,
                failureReason:
                  error instanceof Error ? error.message : "Unknown error",
                retryCount: newRetryCount,
              },
            }),
            prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                processed: true,
                retryCount: newRetryCount,
                processedAt: new Date(),
              },
            }),
          ]);
        } else {
          // Increment retry count for next poll
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { retryCount: newRetryCount },
          });
        }
      }
    }
  } catch (error) {
    console.error("[OutboxWorker] Batch error:", error);
  }
}

/**
 * Start the outbox worker polling loop.
 * Call once during application startup.
 */
export function startOutboxWorker(): void {
  if (globalForWorker.outboxWorkerInterval) {
    console.log("[OutboxWorker] Already running (persisted globally)");
    return;
  }

  console.log(
    `[OutboxWorker] Started (interval: ${POLL_INTERVAL_MS}ms, retries: ${MAX_RETRIES}, batch: ${BATCH_SIZE})`
  );

  // Initial run
  processOutboxBatch();

  // Recurring poll
  globalForWorker.outboxWorkerInterval = setInterval(processOutboxBatch, POLL_INTERVAL_MS);
}

/**
 * Stop the outbox worker.
 */
export function stopOutboxWorker(): void {
  if (globalForWorker.outboxWorkerInterval) {
    clearInterval(globalForWorker.outboxWorkerInterval);
    globalForWorker.outboxWorkerInterval = undefined;
    console.log("[OutboxWorker] Stopped");
  }
}

