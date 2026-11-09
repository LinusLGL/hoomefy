-- Hoomefy: saved designs and their private images.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Everything is locked to the signed-in owner by row-level security.

-- ---------------------------------------------------------------- table
create table if not exists public.designs (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  room_type      text check (room_type in ('living-room','bedroom','kitchen','dining-room','office','bathroom','other')),
  style          text not null check (style in ('scandinavian','japandi','modern-luxury','minimalist','halloween','custom')),
  prompt         text not null default '' check (char_length(prompt) <= 4000),
  preferences    jsonb not null default '{}'::jsonb,
  shopping       jsonb not null default '[]'::jsonb,
  original_path  text not null,
  generated_path text not null,
  created_at     timestamptz not null default now(),
  -- The files must live in the owner's own folder.
  constraint designs_paths_in_owner_folder check (
    original_path  like user_id::text || '/%' and
    generated_path like user_id::text || '/%'
  )
);

create index if not exists designs_user_created_idx on public.designs (user_id, created_at desc);

alter table public.designs enable row level security;

drop policy if exists "designs: owner can read"   on public.designs;
drop policy if exists "designs: owner can insert" on public.designs;
drop policy if exists "designs: owner can update" on public.designs;
drop policy if exists "designs: owner can delete" on public.designs;

create policy "designs: owner can read"   on public.designs for select using (auth.uid() = user_id);
create policy "designs: owner can insert" on public.designs for insert with check (auth.uid() = user_id);
create policy "designs: owner can update" on public.designs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "designs: owner can delete" on public.designs for delete using (auth.uid() = user_id);

-- Keeps the free storage allowance safe: at most 50 designs per person.
create or replace function public.enforce_design_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.designs where user_id = new.user_id) >= 50 then
    raise exception 'design limit reached';
  end if;
  return new;
end;
$$;

drop trigger if exists designs_limit on public.designs;
create trigger designs_limit before insert on public.designs
  for each row execute function public.enforce_design_limit();

-- ---------------------------------------------------------------- storage
-- A private bucket for JPEG files up to 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('designs', 'designs', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "design files: owner can read"   on storage.objects;
drop policy if exists "design files: owner can upload" on storage.objects;
drop policy if exists "design files: owner can delete" on storage.objects;

-- The first folder in a file's path is the owner's user id.
create policy "design files: owner can read" on storage.objects for select
  using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "design files: owner can upload" on storage.objects for insert
  with check (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "design files: owner can delete" on storage.objects for delete
  using (bucket_id = 'designs' and (storage.foldername(name))[1] = auth.uid()::text);
