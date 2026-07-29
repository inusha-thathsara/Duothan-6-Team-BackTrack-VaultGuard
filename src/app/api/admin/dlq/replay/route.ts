import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, requireAuth, requireRole } from "@/lib/middleware/with-auth";
import { prisma } from "@/lib/db/prisma";
import { eventBus } from "@/lib/events/event-bus";
import { auditService } from "@/lib/services/audit/audit.service";
import { applySecurityHeaders, getOrCreateCorrelationId } from "@/lib/middleware/security";
import { handleError } from "@/lib/middleware/error-handler";

export async function POST(req: NextRequest) {
  const correlationId = getOrCreateCorrelationId(req);

  try {
    const auth = await getAuthContext(req);
    requireAuth(auth);
    requireRole(auth, "SUPPORT_OPERATOR");

    const body = await req.json();
    const { dlqId } = body;

    if (!dlqId) {
      const response = NextResponse.json({ error: "dlqId is required" }, { status: 400 });
      return applySecurityHeaders(response, correlationId);
    }

    const dlqEntry = await prisma.deadLetterEntry.findUnique({
      where: { id: dlqId },
    });

    if (!dlqEntry) {
      const response = NextResponse.json({ error: "DLQ entry not found" }, { status: 404 });
      return applySecurityHeaders(response, correlationId);
    }

    // Replay the event to EventBus directly
    const eventPayload = {
      eventId: dlqEntry.originalEventId,
      eventType: dlqEntry.eventType,
      payload: dlqEntry.payload as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    eventBus.publish(eventPayload);

    // Update DLQ record with replayedAt
    await prisma.deadLetterEntry.update({
      where: { id: dlqId },
      data: { replayedAt: new Date() },
    });

    // Record Audit Event for DLQ replay
    await auditService.recordAuditEvent({
      actor: auth.userId,
      actorRole: auth.role,
      action: "admin.dlq_replayed",
      resource: "dead_letter_entry",
      resourceId: dlqId,
      metadata: { originalEventId: dlqEntry.originalEventId, eventType: dlqEntry.eventType },
      correlationId,
    });

    const response = NextResponse.json({
      success: true,
      message: `DLQ entry ${dlqId} replayed successfully`,
      replayedEvent: eventPayload,
    });

    return applySecurityHeaders(response, correlationId);
  } catch (error) {
    const response = handleError(error);
    return applySecurityHeaders(response, correlationId);
  }
}
