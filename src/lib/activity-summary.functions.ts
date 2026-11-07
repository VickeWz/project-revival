import { createServerFn } from '@tanstack/react-start';
import { generateResponse, GatewayError } from '@lovable.dev/ai-gateway';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { activitySummaryInput, activityFacts, activitySummaryPrompt } from './activity-summary';

export const summarizeActivity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => activitySummaryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase.from('profiles')
      .select('id').eq('user_id', context.userId).maybeSingle();
    if (error || !profile) throw new Error('Logga in för att sammanfatta din aktivitet.');
    const facts = activityFacts(data.steps);
    try {
      const response = await generateResponse({
        model: 'openai/gpt-6-astra',
        input: activitySummaryPrompt(data.steps),
      });
      const summary = response.output.flatMap((item) => item.type === 'message'
        ? item.content.flatMap((part) => part.type === 'output_text' ? [part.text] : [])
        : []).join('\n').trim();
      if (!summary) return { ...facts, summary: null, error: 'AI kunde inte sammanfatta aktiviteten. Dina steg och minuter visas fortfarande.' };
      return { ...facts, summary, error: null };
    } catch (error) {
      if (error instanceof GatewayError) console.error('Activity summary Gateway failure', { code: error.code, ids: error.ids });
      else console.error('Activity summary failed');
      return { ...facts, summary: null, error: 'AI-sammanfattningen är inte tillgänglig just nu. Dina steg och minuter påverkas inte.' };
    }
  });