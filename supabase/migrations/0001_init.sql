-- profiles (extend auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  age int,
  gender text check (gender in ('male','female','other')),
  height_cm int,
  weight_kg numeric,
  created_at timestamptz default now()
);

-- subscriptions (client-side chosen plan; integrate Stripe later)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan text check (plan in ('trial','monthly','quarterly','semiannual')) not null,
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  status text default 'active',
  created_at timestamptz default now()
);

-- assessment snapshot
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  goals text[] not null,
  weekly_days int check (weekly_days between 2 and 6),
  height_cm int,
  weight_kg numeric,
  age int,
  gender text,
  name text,
  created_at timestamptz default now()
);

-- workout plans (12-week JSON)
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- reflections (post-workout notes)
create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  energy int,
  soreness int,
  note text,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.assessments enable row level security;
alter table public.workout_plans enable row level security;
alter table public.reflections enable row level security;

create policy "own read" on public.profiles for select using (auth.uid() = id);
create policy "own write" on public.profiles for insert with check (auth.uid() = id);
create policy "own update" on public.profiles for update using (auth.uid() = id);

create policy "subs own read" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subs own write" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subs own update" on public.subscriptions for update using (auth.uid() = user_id);

create policy "assess own read" on public.assessments for select using (auth.uid() = user_id);
create policy "assess own write" on public.assessments for insert with check (auth.uid() = user_id);
create policy "assess own update" on public.assessments for update using (auth.uid() = user_id);

create policy "plans own read" on public.workout_plans for select using (auth.uid() = user_id);
create policy "plans own write" on public.workout_plans for insert with check (auth.uid() = user_id);
create policy "plans own update" on public.workout_plans for update using (auth.uid() = user_id);

create policy "refl own read" on public.reflections for select using (auth.uid() = user_id);
create policy "refl own write" on public.reflections for insert with check (auth.uid() = user_id);

