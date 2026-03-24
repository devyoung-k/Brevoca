alter table public.workspaces
  add column if not exists description text not null default '',
  add column if not exists default_language text not null default 'ko',
  add column if not exists default_prompt_template_id text not null default 'manufacturing-minutes',
  add column if not exists default_export_format text not null default 'markdown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_default_language_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_default_language_check
      check (default_language in ('ko', 'en', 'ja', 'zh'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_default_prompt_template_id_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_default_prompt_template_id_check
      check (default_prompt_template_id in ('general-meeting-summary', 'manufacturing-minutes'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workspaces_default_export_format_check'
  ) then
    alter table public.workspaces
      add constraint workspaces_default_export_format_check
      check (default_export_format in ('markdown', 'docx', 'pdf'));
  end if;
end;
$$;
