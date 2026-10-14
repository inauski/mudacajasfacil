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
- All user data tables carry `user_id` with owner-only RLS; photos live in the private `box-photos` bucket under `{user_id}/` and are read via signed URLs.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate); `/` redirects to `/cajas` or `/auth`.
