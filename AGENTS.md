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
- Box codes (C-001…) are assigned by the `assign_box_code` DB trigger using a per-user `box_counters` row — never compute codes client-side, so numbering stays monotonic even after deletes.
- All user data tables carry `user_id` with owner-only RLS; photos live in the private `box-photos` bucket under `{user_id}/` and are read via signed URLs.
- Signed-in pages live under `src/routes/_authenticated/` (client-only gate); `/` redirects to `/cajas` or `/auth`.
