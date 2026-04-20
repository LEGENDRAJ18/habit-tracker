-- Enable RLS
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  frequency text check (frequency in ('daily', 'weekly')) default 'daily',
  created_at timestamptz default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  completed_at timestamptz default now(),
  notes text
);

-- Row Level Security
alter table habits enable row level security;
alter table habit_logs enable row level security;

create policy "Users can manage their own habits"
  on habits for all
  using (auth.uid() = user_id);

create policy "Users can manage their own habit logs"
  on habit_logs for all
  using (auth.uid() = user_id);
