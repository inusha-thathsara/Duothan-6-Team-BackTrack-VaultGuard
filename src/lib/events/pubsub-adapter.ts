import type { EventPayload } from "./event-bus";

/**
 * GCP Cloud Pub/Sub Adapter (Phase 3 FORTIFY)
 *
 * Provides a cloud-native event publisher for GCP Cloud Pub/Sub.
 * Uses dynamic import so local offline dev without @google-cloud/pubsub installed doesn't fail.
 */

export async function publishToPubSub(
  topicName: string,
  event: EventPayload
): Promise<boolean> {
  try {
    // Dynamic import to prevent build errors if package is missing in local dev
    // @ts-expect-error - @google-cloud/pubsub is optional for local development
    const { PubSub } = await import("@google-cloud/pubsub");
    const pubsub = new PubSub({
      projectId: process.env.GCP_PROJECT_ID,
    });

    const topic = pubsub.topic(topicName);
    const dataBuffer = Buffer.from(JSON.stringify(event));

    const messageId = await topic.publishMessage({
      data: dataBuffer,
      attributes: {
        eventType: event.eventType,
        eventId: event.eventId,
        correlationId: event.correlationId || "",
      },
    });

    console.log(
      `[PubSub] Published message ${messageId} to topic ${topicName}`
    );
    return true;
  } catch (error) {
    console.error(
      `[PubSub] Failed to publish event ${event.eventId} to topic ${topicName}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
