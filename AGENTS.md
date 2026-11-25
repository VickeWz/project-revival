<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Imported GameRun screens live in `src/screens` and keep react-router-style calls via `src/lib/router-compat.tsx`; route files in `src/routes` only wrap them with guards from `src/components/RouteGuards.tsx`. Why: minimal-diff port of the original app.
- Profiles (and child screen-time balances) are created by the `handle_new_user` trigger from signup metadata, not by the client. Why: email confirmation means no session exists right after signup.
- HealthKit reads use one cancellable foreground watcher with non-overlapping queries and a final bounded read at pass completion; unavailable HealthKit never produces simulated pass rewards. Why: prevent stale reads, fabricated steps and updates after unmount.
- Complete passes through the authenticated `complete_step_pass` transaction with a stable session ID; never update activity and balance separately. Why: retries must not double-credit rewards or leave a partial save.
- Pass metric formatting and reward arithmetic are shared through `src/lib/pass-metrics.ts`; keep the transaction formula aligned with that helper. Why: live counters, summaries and saved credits must agree.
- Activity summaries send only validated daily step totals to AI Gateway inside an authenticated server function; reward arithmetic remains deterministic and summaries never modify balances. Why: minimize children's data disclosure and keep AI separate from reward accounting.
- The iPhone app bundles the screens via `vite.native.config.ts` (`npm run build:native` → `native-dist`), swapping server functions for CORS server routes under `src/routes/api/public/native/` that verify the bearer token; keep both paths in sync when adding server functions. Why: a bundled app runs on capacitor://localhost and cannot call same-origin server functions.
- Live pass display uses the local Capacitor Core Motion plugin with session-scoped cumulative readings and HealthKit fallback; final credit stays HealthKit-based. Why: faster sensor updates must not double-count sources or change reward accounting.

- Home activity displays use actual HealthKit readings with an explicit unavailable state; unsupported social, bonus, usage and device-blocking controls must not impersonate connected features. Why: live progress must remain distinguishable from saved balances and unavailable measurements.
- Screen-time redemption uses authenticated idempotent transactions and device-bound absolute expiry; only the native monitor extension restores shields, never a JavaScript timer. Why: balance debits survive retries and enforcement must outlive the app process.
- Screen Time app selection stays on-device in a shared App Group and requires guardian authorization; the app and monitor compile the same state helper. Why: Apple's opaque selections must not leave the device or diverge between processes.
- Child tab screens (Hem, Tjäna, Profil) render inside `src/components/layout/AppScreen.tsx`, choose minutes with `src/components/MinutePicker.tsx`, and use the `header-safe`/`safe-top`/`nav-safe-pb`/`bottom-bar-safe` utilities from `src/styles.css`. Green (`reward`) marks earning, blue (`primary`) marks the balance. Why: one width, iPhone safe areas and one visual language on every screen; Capacitor runs with `contentInset: "never"`.
- Tjäna (`/pass`) offers two ways to earn: Rörelse (passes) and Uppgifter (rounds of tasks in matte, svenska and engelska); Hem links to each with `?del=rorelse|uppgifter`. Why: new earning methods slot in as another part of Tjäna instead of another tab.
- Task questions are generated on the device from `src/lib/tasks/` (3 levels, 5 multiple-choice questions per round) and saved once per round through the idempotent `complete_task_round` RPC with a client-made round id; the server caps task minutes at 20 per Stockholm day and constants live in `src/lib/tasks/rewards.ts`. Why: retries must not double-credit, and the daily cap bounds what a manipulated client can claim since answers are checked on the device.
- The parent app is one overview with pushed child screens and no tab bar; parents read balances, daily activity, requests and linked children's unexpired screen-time sessions through RLS. Both child views share UnlockStatus and the absolute expiry. Why: keep the two views consistent without inferring unlocks from balances or exposing unrelated children.
- Daily step goals live on the child profile; use set_daily_step_goal for owner/linked-parent updates and conditional one-time legacy import, with profile-keyed query caching and foreground refresh. Why: share goals across devices without widening profile write permissions or overwriting an already-saved goal.
- Family pairing uses authenticated database RPCs in both web and native bundles; codes are random, stored hashed, and consumed atomically with the link, while account-bound attempts lock under a row lock and return failures instead of throwing. Why: eliminate child-password sharing and keep one-use codes and failed-attempt persistence safe across retries and concurrent devices.
- Daily HealthKit sharing uses a separate latest-only child row containing local date and total steps, refreshed from actual foreground Home readings with changed-only throttled writes; parents read linked children via RLS. Why: minimize stored activity data.
- Every step earns screen time: Hem claims the day's HealthKit total (and yesterday's once per app run) through `claim_daily_steps`, which credits only whole minutes not yet earned that day in `movement_day_credits`; `complete_step_pass` adds to the same per-day row. Use `src/lib/step-rewards.ts`, never write balances or activity from the client. Why: passes and daily totals come from the same HealthKit steps and must never be counted twice.
- Read Home's saved movement minutes from `movement_day_credits`, not pass-only `activity_logs`. Why: daily step claims must remain visible after reopening the app.
