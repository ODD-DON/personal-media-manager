-- Create pmp_push_subscriptions table for Web Push (PWA)
create table if not exists public.pmp_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscription_json jsonb not null,
  device_label text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.pmp_push_subscriptions enable row level security;

-- Allow all operations (same pattern as other pmp_ tables)
create policy "Allow all operations on pmp_push_subscriptions"
  on public.pmp_push_subscriptions
  for all
  using (true)
  with check (true);
