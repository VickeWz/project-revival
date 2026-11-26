import { z } from "zod";
import { issuedCodeSchema, pairingCodeSchema } from "@/lib/pairing-code";
import { untypedRpc } from "@/lib/untyped-db";

/** How long the child's iPhone stays open for changes after a valid parent code. */
export const CHANGE_WINDOW_SECONDS = 10 * 60;

export const changeCodeResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok") }),
  z.object({ status: z.literal("invalid"), attemptsRemaining: z.number().int().min(0).max(4) }),
  z.object({ status: z.literal("blocked"), blockedUntil: z.string().datetime({ offset: true }) }),
]);
export type ChangeCodeResult = z.infer<typeof changeCodeResultSchema>;

/** Parent: a one-time six-digit code (5 minutes) that lets a linked child's iPhone change apps and lock mode. */
export async function createDeviceChangeCode(childId: string): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await untypedRpc("create_device_change_code", { p_child_id: childId });
  if (error) throw error;
  return issuedCodeSchema.parse(data);
}

/** Child: spends the parent's code. Failures are returned, not thrown, so attempts are counted. */
export async function consumeDeviceChangeCode(code: string): Promise<ChangeCodeResult> {
  const parsed = pairingCodeSchema.parse(code);
  const { data, error } = await untypedRpc("consume_device_change_code", { p_code: parsed });
  if (error) throw error;
  return changeCodeResultSchema.parse(data);
}
