import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isPaymentsDegraded } from "@/lib/services/payments/risk-check";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";

export async function GET(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  let dbStatus = "unhealthy";
  let dbLatencyMs = 0;
  let pendingOutboxCount = 0;
  let dlqCount = 0;

  const startTime = Date.now();

  try {
    // Database probe
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "healthy";
    dbLatencyMs = Date.now() - startTime;

    // Metrics probe
    const [outbox, dlq] = await Promise.all([
      prisma.outboxEvent.count({ where: { processed: false } }),
      prisma.deadLetterEntry.count({ where: { replayedAt: null } }),
    ]);
    pendingOutboxCount = outbox;
    dlqCount = dlq;
  } catch (error) {
    dbStatus = `error: ${error instanceof Error ? error.message : "Connection failed"}`;
  }

  const paymentsDegraded = isPaymentsDegraded();
  const overallStatus = dbStatus === "healthy" ? (paymentsDegraded ? "degraded" : "healthy") : "unhealthy";

  const response = NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        eventBus: {
          status: "healthy",
          type: "in-process-pubsub",
        },
        paymentsService: {
          status: paymentsDegraded ? "degraded" : "healthy",
          mode: paymentsDegraded ? "degraded_read_only" : "normal",
        },
        outboxWorker: {
          pendingEvents: pendingOutboxCount,
          dlqUnresolvedCount: dlqCount,
        },
      },
    },
    { status: overallStatus === "unhealthy" ? 503 : 200 }
  );

  return applySecurityHeaders(response, correlationId);
}

