import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { consumeDeviceChangeCode, createDeviceChangeCode } from "@/lib/device-change-code";

const child = "427a6b75-72e3-4848-a4ee-6448d7e5e289";
beforeEach(() => { vi.clearAllMocks(); });

describe("parent code for lock changes", () => {
  it("creates a code for one linked child", async () => {
    const expiresAt = new Date(Date.now() + 300000).toISOString();
    rpc.mockResolvedValue({ data: { code: "042913", expiresAt }, error: null });
    await expect(createDeviceChangeCode(child)).resolves.toEqual({ code: "042913", expiresAt });
    expect(rpc).toHaveBeenCalledWith("create_device_change_code", { p_child_id: child });
  });

  it("returns ok, invalid and blocked results instead of throwing", async () => {
    rpc.mockResolvedValueOnce({ data: { status: "ok" }, error: null });
    await expect(consumeDeviceChangeCode("123456")).resolves.toEqual({ status: "ok" });
    rpc.mockResolvedValueOnce({ data: { status: "invalid", attemptsRemaining: 3 }, error: null });
    await expect(consumeDeviceChangeCode("123456")).resolves.toEqual({ status: "invalid", attemptsRemaining: 3 });
    const blockedUntil = new Date(Date.now() + 900000).toISOString();
    rpc.mockResolvedValueOnce({ data: { status: "blocked", blockedUntil }, error: null });
    await expect(consumeDeviceChangeCode("123456")).resolves.toEqual({ status: "blocked", blockedUntil });
    expect(rpc).toHaveBeenCalledWith("consume_device_change_code", { p_code: "123456" });
  });

  it("never sends anything but six digits", async () => {
    for (const code of ["12345", "1234567", "12a456", ""]) await expect(consumeDeviceChangeCode(code)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not treat an unexpected answer or a server error as approval", async () => {
    rpc.mockResolvedValueOnce({ data: { status: "linked" }, error: null });
    await expect(consumeDeviceChangeCode("123456")).rejects.toThrow();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Could not find the function" } });
    await expect(consumeDeviceChangeCode("123456")).rejects.toBeTruthy();
  });
});
