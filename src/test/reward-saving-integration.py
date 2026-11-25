"""Authenticated reward regression: run after lovable auth-session with a child test account.

Uses real database transactions and the task UI; writes rewards only to that test account.
Screenshots and diagnostics stay under /tmp/browser/reward-save.
"""
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright
from lovable_playwright_defaults import signed_in_context

OUT = Path('/tmp/browser/reward-save')
OUT.mkdir(parents=True, exist_ok=True)


async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await signed_in_context(browser)
        page = await context.new_page()
        await page.goto('http://localhost:8080/pass?del=uppgifter', wait_until='networkidle')
        await page.get_by_role('radio', name='Lätt', exact=False).click()
        await page.get_by_role('button', name='Matte').click()
        for index in range(5):
            await page.get_by_text(f'Fråga {index + 1} av 5', exact=True).wait_for()
            prompt = await page.get_by_role('heading', level=1).inner_text()
            values = [int(value) for value in re.findall(r'\d+', prompt)]
            if 'hälften' in prompt:
                answer = values[0] // 2
            elif '+' in prompt:
                answer = values[0] + values[1]
            elif '−' in prompt:
                answer = values[0] - values[1]
            elif '·' in prompt:
                answer = values[0] * values[1]
            else:
                raise AssertionError(f'Unexpected easy question: {prompt}')
            await page.locator('li').get_by_role('button', name=str(answer), exact=True).click()
            await page.get_by_role('button', name='Se resultat' if index == 4 else 'Nästa fråga', exact=True).click()
        await page.get_by_role('heading', name='Alla rätt!', exact=True).wait_for()
        await page.screenshot(path=str(OUT / 'tasks-saved.png'))
        result = await page.evaluate('''async () => {
          const {supabase} = await import('/src/integrations/supabase/client.ts');
          const call = async (fn, args) => {
            const {data,error} = await supabase.rpc(fn,args);
            if (error) throw new Error(error.message);
            return data;
          };
          const {data:{user}} = await supabase.auth.getUser();
          const {data:profile} = await supabase.from('profiles').select('id').eq('user_id',user.id).single();
          const day = new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Stockholm'});
          const readBalance = async () => (await supabase.from('screen_time_balance').select('minutes_remaining').eq('user_id',profile.id).single()).data.minutes_remaining;
          const {data:round} = await supabase.from('task_rounds').select('*').eq('profile_id',profile.id).order('created_at',{ascending:false}).limit(1).single();
          const beforeRetry = await readBalance();
          const retry = await call('complete_task_round',{p_id:round.id,p_subject:round.subject,p_level:round.level,p_correct:round.correct,p_total:round.total,p_started_at:round.started_at});
          if (await readBalance() !== beforeRetry) throw new Error('Task replay double credited');
          let capped;
          for(let i=0;i<5;i++) capped=await call('complete_task_round',{p_id:crypto.randomUUID(),p_subject:'matte',p_level:1,p_correct:5,p_total:5,p_started_at:new Date().toISOString()});
          if(capped.today_minutes!==20 || capped.earned_minutes!==0) throw new Error('20 minute task cap failed');
          const {data:previous} = await supabase.from('movement_day_credits').select('*').eq('profile_id',profile.id).eq('day',day).maybeSingle();
          const baseSteps = Math.max(previous?.pass_steps ?? 0,previous?.daily_steps ?? 0);
          const steps = Math.ceil(baseSteps/200)*200+1000;
          const initial = await readBalance();
          const daily = await call('claim_daily_steps',{p_day:day,p_steps:steps});
          const repeated = await call('claim_daily_steps',{p_day:day,p_steps:steps});
          if(daily.day_minutes!==steps/200 || repeated.earned_minutes!==0) throw new Error('200 steps per minute or daily replay failed');
          if(await readBalance()!==initial+daily.earned_minutes) throw new Error('Daily balance not saved');
          const end=new Date();const start=new Date(end-1000);
          const passArgs={p_id:crypto.randomUUID(),p_started_at:start.toISOString(),p_ended_at:end.toISOString(),p_day:day,p_steps:200,p_distance:120,p_active_minutes:0};
          const pass=await call('complete_step_pass',passArgs);
          const passRetry=await call('complete_step_pass',passArgs);
          if(pass.earned_minutes!==0 || passRetry.earned_minutes!==0) throw new Error('Steps shared by daily total and pass double credited');
          return {balance:await readBalance(),daily,pass,taskRetry:retry,taskCap:capped};
        }''')
        await page.goto('http://localhost:8080/child', wait_until='networkidle')
        await page.get_by_role('region', name='Din skärmtid').get_by_text(str(result['balance']), exact=False).wait_for()
        await page.reload(wait_until='networkidle')
        await page.get_by_role('region', name='Din skärmtid').get_by_text(str(result['balance']), exact=False).wait_for()
        await page.screenshot(path=str(OUT / 'balance-reloaded.png'))
        print('PASS: task UI saved; 20-minute cap; 200 steps/minute; daily/pass retries; no double credit; balance persisted through reload.')
        await browser.close()


asyncio.run(main())