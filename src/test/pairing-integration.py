"""Real signed-in pairing checks. Provide private parent/child Playwright storage files via environment variables."""
import asyncio
import os
import time
from pathlib import Path
from playwright.async_api import async_playwright

RPC = """async ({name, args}) => {
 const {supabase}=await import('/src/integrations/supabase/client.ts');
 const {data,error}=await supabase.rpc(name,args);
 if(error) throw new Error(error.message);
 return data;
}"""

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  child_context=await browser.new_context(storage_state=os.environ['PAIRING_CHILD_STATE'])
  parent_context=await browser.new_context(storage_state=os.environ['PAIRING_PARENT_STATE'])
  child=await child_context.new_page()
  parent=await parent_context.new_page()
  await child.goto('http://localhost:8080/profile',wait_until='domcontentloaded')
  await child.get_by_role('button',name='Koppla förälder',exact=True).click()
  await child.get_by_role('button',name='Visa kod',exact=True).click()
  await child.get_by_label('Kopplingskod',exact=True).wait_for()
  code=await child.get_by_label('Kopplingskod',exact=True).inner_text()
  assert len(code)==6 and code.isdigit()
  issued=await child.evaluate(RPC,{'name':'create_child_pairing_code','args':{}})
  expiry=__import__('datetime').datetime.fromisoformat(issued['expiresAt'].replace('Z','+00:00')).timestamp()
  assert 595 < expiry-time.time() <= 600, 'Code must expire in 10 minutes'
  # The replacement code is deliberately generated again through the UI for the main flow.
  await child.get_by_role('button',name='Skapa ny kod',exact=True).click()
  await child.get_by_role('button',name='Skapa ny kod',exact=True).wait_for(state='visible')
  await child.wait_for_function('(old) => document.querySelector("[aria-label=Kopplingskod]")?.textContent !== old',arg=code)
  code=await child.get_by_label('Kopplingskod',exact=True).inner_text()
  await parent.goto('http://localhost:8080/parent/add-child',wait_until='domcontentloaded')
  await parent.get_by_label('Sexsiffrig kod').fill(code)
  await parent.get_by_role('button',name='Koppla konto',exact=True).click()
  await parent.get_by_role('heading',name='Dina barn').wait_for(timeout=30000)
  await parent.get_by_text('Kodtest',exact=True).wait_for()
  print('Child code generated and linked child reads back in parent UI')
  replay=await parent.evaluate(RPC,{'name':'consume_child_pairing_code','args':{'p_code':code}})
  assert replay=={'status':'invalid','attemptsRemaining':4}, 'Used code cannot link again'
  # Repeated use of a known-consumed code avoids guessing a live code belonging to another child.
  for left in [3,2,1]:
   failed=await parent.evaluate(RPC,{'name':'consume_child_pairing_code','args':{'p_code':code}})
   assert failed=={'status':'invalid','attemptsRemaining':left}
  blocked=await parent.evaluate(RPC,{'name':'consume_child_pairing_code','args':{'p_code':code}})
  assert blocked['status']=='blocked', 'Fifth failed attempt must lock the account'
  end=__import__('datetime').datetime.fromisoformat(blocked['blockedUntil'].replace('Z','+00:00')).timestamp()
  assert 895 < end-time.time() <= 900, 'Lockout must last 15 minutes'
  fresh=await child.evaluate(RPC,{'name':'create_child_pairing_code','args':{}})
  denied=await parent.evaluate(RPC,{'name':'consume_child_pairing_code','args':{'p_code':fresh['code']}})
  assert denied==blocked, 'Even a valid code must be denied during lockout'
  await parent.goto('http://localhost:8080/parent/add-child',wait_until='domcontentloaded')
  await parent.get_by_label('Sexsiffrig kod').fill(fresh['code'])
  await parent.get_by_role('button',name='Koppla konto',exact=True).click()
  await parent.get_by_role('alert').filter(has_text='Koppling spärrad').wait_for()
  assert await parent.get_by_role('button',name='Koppla konto',exact=True).is_disabled()
  await parent.get_by_role('alert').filter(has_text='Koppling spärrad').screenshot(path=os.environ.get('PAIRING_SCREENSHOT','/tmp/browser/pairing/blocked.png'))
  print('Single-use verified; 5 failed attempts produce 15-minute lockout, persistent after page reload')
  await browser.close()

asyncio.run(main())