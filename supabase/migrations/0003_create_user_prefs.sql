create table if not exists public.user_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  username text,
  biometric_enabled boolean not null default false,
  timezone text not null default 'America/New_York',
  push_token text,
  preferred_windows text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_prefs_user_id_key on public.user_prefs (user_id);

create or replace function public.set_user_prefs_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_prefs_updated_at on public.user_prefs;
create trigger set_user_prefs_updated_at
before update on public.user_prefs
for each row execute function public.set_user_prefs_updated_at();

alter table public.user_prefs enable row level security;

drop policy if exists "user_prefs select own" on public.user_prefs;
create policy "user_prefs select own"
  on public.user_prefs
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_prefs insert own" on public.user_prefs;
create policy "user_prefs insert own"
  on public.user_prefs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_prefs update own" on public.user_prefs;
create policy "user_prefs update own"
  on public.user_prefs
  for update
  using (auth.uid() = user_id);



