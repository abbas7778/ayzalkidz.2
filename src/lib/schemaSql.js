export const HOSPITAL_SCHEMA_SQL = `-- Ayzal Kidz Care Hospital — run once in Supabase SQL Editor
-- Project: https://vplviowhxtasjgpptzsd.supabase.co

create table if not exists public.staff (
  id serial primary key,
  name text not null,
  mobile text,
  type text default 'staff',
  qualification text,
  designation text,
  joining_date text,
  salary numeric default 0,
  status text default 'active',
  notes text
);

create table if not exists public.staff_payments (
  id serial primary key,
  staff_id integer references public.staff(id) on delete cascade,
  staff_name text,
  txn_date text,
  payment_type text,
  amount numeric,
  month text,
  payment_mode text,
  paid_by text,
  reference text,
  notes text,
  expense_id integer,
  created_by text
);

create table if not exists public.income (
  id serial primary key,
  txn_date text not null,
  category text not null,
  description text,
  amount numeric not null,
  payment_mode text,
  receipt_number text,
  notes text,
  created_by text
);

create table if not exists public.expenses (
  id serial primary key,
  txn_date text not null,
  category text not null,
  item text,
  quantity numeric default 1,
  amount numeric not null,
  payment_mode text,
  paid_by text,
  bill_number text,
  bill_photo text,
  notes text,
  created_by text
);

create table if not exists public.maintenance (
  id serial primary key,
  txn_date text not null,
  category text not null,
  item text,
  quantity numeric default 1,
  amount numeric not null,
  payment_mode text,
  paid_by text,
  bill_number text,
  notes text,
  created_by text
);

create table if not exists public.purchases (
  id serial primary key,
  txn_date text not null,
  category text,
  seller text,
  item text not null,
  quantity numeric,
  rate numeric,
  total numeric not null,
  payment_mode text,
  bill_number text,
  bill_photo text,
  notes text,
  created_by text
);

create table if not exists public.app_users (
  id serial primary key,
  user_id text,
  name text not null,
  email text not null,
  role text default 'staff',
  mobile text,
  status text default 'active',
  permissions jsonb
);

create table if not exists public.hospital_settings (
  id serial primary key,
  hospital_name text,
  address text,
  phone text,
  email text,
  gstin text,
  logo_url text,
  language text,
  currency text,
  printer text,
  updated_at timestamptz
);

create table if not exists public.categories (
  id serial primary key,
  kind text not null,
  name text not null,
  active boolean default true
);

create table if not exists public.backups (
  id serial primary key,
  backup_type text,
  status text,
  size_kb integer,
  notes text,
  created_by text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id serial primary key,
  title text not null,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id serial primary key,
  actor_id text,
  actor_name text,
  actor_email text,
  action text,
  module text,
  entity text,
  entity_id text,
  summary text,
  details jsonb,
  created_at timestamptz default now()
);

alter table public.staff enable row level security;
alter table public.staff_payments enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.maintenance enable row level security;
alter table public.purchases enable row level security;
alter table public.app_users enable row level security;
alter table public.hospital_settings enable row level security;
alter table public.categories enable row level security;
alter table public.backups enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['staff','staff_payments','income','expenses','maintenance','purchases','app_users','hospital_settings','categories','backups','notifications','audit_logs']
  loop
    execute format('drop policy if exists authenticated_all on public.%I', t);
    execute format('create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

insert into public.hospital_settings (hospital_name, address, phone, email, language, currency, printer, logo_url)
select 'Ayzal Kidz Care Hospital', 'Tharad, Banaskantha, Gujarat', '', '', 'en', 'INR', 'a4', '/logo.png'
where not exists (select 1 from public.hospital_settings);

insert into public.categories (kind, name, active)
select * from (values
  ('income','OPD Consultation', true),
  ('income','Vaccination', true),
  ('income','Pharmacy', true),
  ('income','Laboratory', true),
  ('income','Ward Admission', true),
  ('income','Procedure', true),
  ('income','Emergency', true),
  ('expense','Salary', true),
  ('expense','Electricity', true),
  ('expense','Water', true),
  ('expense','Pharmacy Stock', true),
  ('expense','Oxygen & Gas', true),
  ('expense','Internet', true),
  ('expense','Fuel', true),
  ('expense','Refreshments', true),
  ('expense','Stationery', true),
  ('expense','Miscellaneous', true),
  ('expense','Staff Advance', true),
  ('expense','Staff Bonus', true),
  ('expense','Staff Payment', true)
) as v(kind, name, active)
where not exists (select 1 from public.categories);

insert into storage.buckets (id, name, public)
values ('hospital-docs', 'hospital-docs', true)
on conflict (id) do nothing;

drop policy if exists hospital_docs_select on storage.objects;
drop policy if exists hospital_docs_write on storage.objects;
create policy hospital_docs_select on storage.objects for select to public using (bucket_id = 'hospital-docs');
create policy hospital_docs_write on storage.objects for all to authenticated using (bucket_id = 'hospital-docs') with check (bucket_id = 'hospital-docs');
`;
