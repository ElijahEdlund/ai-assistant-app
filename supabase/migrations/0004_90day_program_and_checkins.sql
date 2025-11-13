-- Add programStartDate to workout_plans for 90-day program tracking
alter table public.workout_plans
add column if not exists program_start_date date;

-- Create check_ins table for pre/post workout AI interactions
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  program_id uuid references public.workout_plans(id) on delete set null,
  day_number int check (day_number between 1 and 90),
  date date not null,
  type text not null check (type in ('pre', 'post')),
  user_message text not null,
  ai_response text,
  created_at timestamptz default now()
);

create index if not exists check_ins_user_date_idx on public.check_ins(user_id, date);
create index if not exists check_ins_program_day_idx on public.check_ins(program_id, day_number);

alter table public.check_ins enable row level security;

create policy "check_ins own read" on public.check_ins
  for select using (auth.uid() = user_id);

create policy "check_ins own write" on public.check_ins
  for insert with check (auth.uid() = user_id);

create policy "check_ins own update" on public.check_ins
  for update using (auth.uid() = user_id);

