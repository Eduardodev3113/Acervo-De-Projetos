create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_class text not null default '',
  year text not null default '',
  tech text[] not null default '{}',
  resources text[] not null default '{}',
  area text not null default '',
  status text not null,
  description text not null,
  objective text not null default '',
  results text not null default '',
  team text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,
  mine_status text not null default 'Em desenvolvimento',
  version_of uuid references public.projects(id) on delete set null,
  plan text not null default '',
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

drop policy if exists "Anyone can read projects" on public.projects;
create policy "Anyone can read projects"
  on public.projects for select to anon, authenticated using (true);

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
  on public.projects for insert to authenticated
  with check (
    auth.uid() = owner_id
    and (
      lower(coalesce(auth.jwt() ->> 'email', '')) like '%@ifsc.edu.br'
      or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@aluno.ifsc.edu.br'
    )
  );

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete to authenticated
  using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-attachments',
  'project-attachments',
  true,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'application/zip']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read project attachments" on storage.objects;
create policy "Anyone can read project attachments"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'project-attachments');

drop policy if exists "Users can upload their own project attachments" on storage.objects;
create policy "Users can upload their own project attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      lower(coalesce(auth.jwt() ->> 'email', '')) like '%@ifsc.edu.br'
      or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@aluno.ifsc.edu.br'
    )
  );

drop policy if exists "Users can update their own project attachments" on storage.objects;
create policy "Users can update their own project attachments"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      lower(coalesce(auth.jwt() ->> 'email', '')) like '%@ifsc.edu.br'
      or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@aluno.ifsc.edu.br'
    )
  )
  with check (
    bucket_id = 'project-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      lower(coalesce(auth.jwt() ->> 'email', '')) like '%@ifsc.edu.br'
      or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@aluno.ifsc.edu.br'
    )
  );

drop policy if exists "Users can delete their own project attachments" on storage.objects;
create policy "Users can delete their own project attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );