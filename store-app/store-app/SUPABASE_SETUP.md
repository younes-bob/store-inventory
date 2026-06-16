# Supabase Setup

Run this SQL in your Supabase SQL editor to create the subscriptions table:

```sql
create table if not exists subscriptions (
  id text primary key default 'main',
  plan text not null default 'free',
  status text not null default 'active',
  activated_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

-- Insert default free plan
insert into subscriptions (id, plan, status)
values ('main', 'free', 'active')
on conflict (id) do nothing;

-- Allow read/write from the app
alter table subscriptions enable row level security;
create policy "allow all" on subscriptions for all using (true);
```
