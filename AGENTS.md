<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Box codes are assigned on insert by the `assign_box_code` DB trigger via per-user `box_counters` (never client-side, monotonic after deletes); users may edit `code` afterwards (unique per user, case-insensitive) while `number` stays immutable.
- Box collaboration uses per-box `box_shares`, never global roles; SQL RPCs bind invitations only to confirmed auth identities and RLS/identity triggers enforce each permission to prevent client-side escalation.
- Items retain their box owner; private photos stay under `{owner_id}/{box_id}/`, with collaborator access limited to referenced files and signed URLs lasting 60 seconds to bound revocation latency.
- Own inventory/export queries explicitly filter the signed-in owner; shared boxes appear in a separate list to avoid contaminating private inventory.
- Downloadable box documents are escaped, self-contained HTML snapshots without photos; native device sharing never connects a developer-owned external account.
- Login preserves only allowlisted local box destinations across password and Google OAuth sign-in to prevent open redirects.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate); `/` redirects to `/cajas` or `/auth`.
