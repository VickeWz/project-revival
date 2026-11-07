import { supabase } from "@/integrations/supabase/client";

// In the bundled iPhone app the screens run from local files, so server work goes to the published backend.
export const API_ORIGIN = import.meta.env['VITE_NATIVE_API_ORIGIN'] || "https://second-life-project-archive.lovable.app";

export async function callNativeApi<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_ORIGIN}/api/public/native/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json as T;
}
