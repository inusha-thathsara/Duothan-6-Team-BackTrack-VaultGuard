export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("Initializing VaultGuard Outbox Background Worker...");
    const { startOutboxWorker } = await import("@/lib/events/outbox-worker");
    startOutboxWorker();
  }
}
