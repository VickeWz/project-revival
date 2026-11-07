import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { activityFacts, activitySummaryPrompt } from "./activity-summary";

export async function runSummarizeActivity(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: { steps: number },
) {
  const { data: profile, error } = await supabase.from("profiles")
    .select("id").eq("user_id", userId).maybeSingle();
  if (error || !profile) throw new Error("Logga in för att sammanfatta din aktivitet.");
  const facts = activityFacts(data.steps);
  try {
    const response = await generateResponse({
      model: "openai/gpt-6-astra",
      input: activitySummaryPrompt(data.steps),
    });
    const summary = response.output.flatMap((item) => item.type === "message"
      ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : [])
      : []).join("\n").trim();
    if (!summary) return { ...facts, summary: null, error: "AI kunde inte sammanfatta aktiviteten. Dina steg och minuter visas fortfarande." };
    return { ...facts, summary, error: null };
  } catch (error) {
    if (error instanceof GatewayError) console.error("Activity summary Gateway failure", { code: error.code, ids: error.ids });
    else console.error("Activity summary failed");
    return { ...facts, summary: null, error: "AI-sammanfattningen är inte tillgänglig just nu. Dina steg och minuter påverkas inte." };
  }
}
