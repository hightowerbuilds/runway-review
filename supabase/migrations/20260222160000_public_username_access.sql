alter table public.workspace_code_state disable row level security;

drop policy if exists "workspace_code_state_select_own" on public.workspace_code_state;
drop policy if exists "workspace_code_state_upsert_own" on public.workspace_code_state;
drop policy if exists "workspace_code_state_update_own" on public.workspace_code_state;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.workspace_code_state to anon, authenticated;
