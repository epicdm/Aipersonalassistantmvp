import { prisma } from "@/app/lib/prisma";

/**
 * Store raw webhook payload before processing.
 * If processing fails, the payload is preserved for replay.
 */
export async function logWebhook(
  source: "whatsapp" | "instagram" | "messenger" | "stripe",
  rawPayload: unknown
): Promise<string> {
  const log = await prisma.webhookLog.create({
    data: {
      source,
      rawPayload: rawPayload as any,
    },
  });
  return log.id;
}

/**
 * Mark a webhook log entry as successfully processed.
 */
export async function markWebhookProcessed(id: string): Promise<void> {
  await prisma.webhookLog.update({
    where: { id },
    data: { processedAt: new Date() },
  });
}

/**
 * Mark a webhook log entry as failed with error message.
 */
export async function markWebhookFailed(
  id: string,
  error: string
): Promise<void> {
  await prisma.webhookLog.update({
    where: { id },
    data: { error },
  });
}
