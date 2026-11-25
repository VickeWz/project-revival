import { z } from "zod";

export const pairingCodeSchema = z.string().regex(/^\d{6}$/, "Ange en sexsiffrig kod");
export const issuedCodeSchema = z.object({ code: pairingCodeSchema, expiresAt: z.string().datetime({ offset: true }) });
export const pairingResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("linked"), childName: z.string() }),
  z.object({ status: z.literal("invalid"), attemptsRemaining: z.number().int().min(0).max(4) }),
  z.object({ status: z.literal("blocked"), blockedUntil: z.string().datetime({ offset: true }) }),
]);

export function secondsLeft(expiresAt: string, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) || 0;
}