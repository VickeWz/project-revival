import { supabase } from "@/integrations/supabase/client";

/**
 * Database functions and tables added after the generated Supabase types (claim_daily_steps,
 * complete_task_round, task_rounds). Switch to the typed client once types.ts is regenerated.
 */
type RpcResult = { data: unknown; error: { message: string; code?: string } | null };
type UntypedClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

const client = supabase as unknown as UntypedClient;

export const untypedRpc = (fn: string, args: Record<string, unknown>) => client.rpc(fn, args);
export const untypedFrom = (table: string) => client.from(table);
