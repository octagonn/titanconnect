-- Social media links on profiles (Instagram handle, LinkedIn/Linktree/Website URLs)
alter table public.profiles
  add column if not exists instagram text,
  add column if not exists linkedin text,
  add column if not exists linktree text,
  add column if not exists website text;
