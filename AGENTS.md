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
- Activity summaries send only validated daily step totals to AI Gateway inside an authenticated server function; reward arithmetic remains deterministic and summaries never modify balances. Why: minimize children's data disclosure and keep AI separate from reward accounting.
