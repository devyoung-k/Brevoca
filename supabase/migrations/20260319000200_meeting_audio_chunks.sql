alter table public.meetings
  add column if not exists audio_chunk_count integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meetings_audio_chunk_count_check'
  ) then
    alter table public.meetings
      add constraint meetings_audio_chunk_count_check
      check (audio_chunk_count > 0);
  end if;
end;
$$;
