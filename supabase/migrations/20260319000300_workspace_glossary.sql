alter table public.workspaces
  add column if not exists glossary_text text not null default '';
