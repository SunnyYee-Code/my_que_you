create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null check (status in ('not_applied', 'cooling_off', 'cancelled', 'processing', 'completed', 'rejected')),
  applied_at timestamptz not null default now(),
  cooling_off_expire_at timestamptz not null,
  forbidden_reason text,
  result_reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_deletion_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  operator_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_audit_logs enable row level security;

alter table public.profiles
  add column if not exists deletion_status text not null default 'not_applied',
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_completed_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.profiles
set deletion_status = coalesce(deletion_status, 'not_applied')
where deletion_status is null;

alter table public.profiles
  alter column deletion_status set default 'not_applied';

create or replace function public.set_account_deletion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_account_deletion_requests_updated_at on public.account_deletion_requests;
create trigger trg_account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row
execute function public.set_account_deletion_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'notification_type' and n.nspname = 'public'
  ) then
    raise notice 'notification_type enum not found';
  elsif not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'notification_type' and e.enumlabel = 'account_deletion'
  ) then
    alter type public.notification_type add value 'account_deletion';
  end if;
end $$;

create policy "Users view own deletion request"
on public.account_deletion_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users insert own deletion request"
on public.account_deletion_requests
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users update own deletion request"
on public.account_deletion_requests
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins manage deletion requests"
on public.account_deletion_requests
for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role));

create policy "Users view own deletion audit logs"
on public.account_deletion_audit_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins manage deletion audit logs"
on public.account_deletion_audit_logs
for all
to authenticated
using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'super_admin'::app_role));


create unique index if not exists idx_deleted_emails_user_id on public.deleted_emails(user_id);

do $$
begin
  perform cron.unschedule('auto-finalize-account-deletion');
exception
  when others then null;
end $$;

select cron.schedule(
  'auto-finalize-account-deletion',
  '*/10 * * * *',
  $$
  select
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-finalize-account-deletion',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
