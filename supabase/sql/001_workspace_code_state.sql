create table if not exists public.workspace_code_state (
  workspace_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.workspace_code_state enable row level security;

create policy "workspace_code_state_select_own"
on public.workspace_code_state
for select
to authenticated
using (workspace_id = auth.uid()::text);

create policy "workspace_code_state_upsert_own"
on public.workspace_code_state
for insert
to authenticated
with check (workspace_id = auth.uid()::text);

create policy "workspace_code_state_update_own"
on public.workspace_code_state
for update
to authenticated
using (workspace_id = auth.uid()::text)
with check (workspace_id = auth.uid()::text);
