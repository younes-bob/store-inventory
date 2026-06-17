# Supabase Setup

Run this SQL in your Supabase SQL editor (Database → SQL Editor → New Query):

```sql
-- Items table (already exists)
-- Sales table (already exists)

-- Subscriptions table (new)
create table if not exists subscriptions (
  store_id text primary key,
  plan text not null default 'free',
  status text not null default 'active',
  activated_at timestamptz,
  expires_at timestamptz,
  months_paid int default 1,
  note text default '',
  payment_method text default 'manual',
  updated_at timestamptz default now()
);

-- Allow app to read/write subscriptions
alter table subscriptions enable row level security;

drop policy if exists "allow all" on subscriptions;
create policy "allow all" on subscriptions for all using (true);
```

---

# How the Owner Panel works

1. Go to: https://your-app.vercel.app/owner
2. Enter the OWNER_PASS from src/config.js  
3. You will see all stores and their subscription status
4. To give a client access:
   - Select their store
   - Choose Standard or Pro plan
   - Choose duration (1, 3, 6, or 12 months)
   - Add a note (e.g. "paid cash 990 DA")
   - Click Activate Plan
5. Client refreshes the app → their plan is active instantly

---

# How to change your passwords

Open src/config.js and change:
- OWNER_PASS → your secret owner panel password (only YOU know this)
- ADMIN_PASS → the store admin password (for store managers)
- OWNER_WHATSAPP → your WhatsApp number with country code (e.g. 213555123456)
