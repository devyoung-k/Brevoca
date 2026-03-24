alter table public.jobs
  add column if not exists processor_id text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists lease_heartbeat_at timestamptz;

comment on column public.jobs.processor_id is 'Current processor lease owner for the job.';
comment on column public.jobs.lease_expires_at is 'Lease expiration timestamp for in-flight job processing.';
comment on column public.jobs.lease_heartbeat_at is 'Last successful heartbeat for the active processor lease.';

create or replace function public.acquire_job_lease(
  p_job_id uuid,
  p_processor_id text,
  p_lease_until timestamptz
)
returns boolean
language plpgsql
as $$
declare
  updated_count integer;
begin
  update public.jobs
  set
    processor_id = p_processor_id,
    lease_expires_at = p_lease_until,
    lease_heartbeat_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_job_id
    and status in ('queued', 'processing')
    and (
      processor_id = p_processor_id
      or lease_expires_at is null
      or lease_expires_at < timezone('utc', now())
    );

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.renew_job_lease(
  p_job_id uuid,
  p_processor_id text,
  p_lease_until timestamptz
)
returns boolean
language plpgsql
as $$
declare
  updated_count integer;
begin
  update public.jobs
  set
    lease_expires_at = p_lease_until,
    lease_heartbeat_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_job_id
    and processor_id = p_processor_id
    and status in ('queued', 'processing');

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.release_job_lease(
  p_job_id uuid,
  p_processor_id text
)
returns boolean
language plpgsql
as $$
declare
  updated_count integer;
begin
  update public.jobs
  set
    processor_id = null,
    lease_expires_at = null,
    lease_heartbeat_at = null,
    updated_at = timezone('utc', now())
  where id = p_job_id
    and processor_id = p_processor_id;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;
