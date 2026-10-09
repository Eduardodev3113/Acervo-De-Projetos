create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_class text not null default '',
  year text not null default '',
  tech text[] not null default '{}',
  resources text[] not null default '{}',
  area text not null default '',
  oi_core text not null default '',
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

alter table public.projects add column if not exists oi_core text not null default '';

update public.projects
set oi_core = 'OI 3 - Sustentabilidade'
where id in (
  'a1000000-0000-4000-8000-000000000001'::uuid,
  'a1000000-0000-4000-8000-000000000002'::uuid,
  'a1000000-0000-4000-8000-000000000003'::uuid,
  'a1000000-0000-4000-8000-000000000004'::uuid,
  'a1000000-0000-4000-8000-000000000005'::uuid,
  'a1000000-0000-4000-8000-000000000006'::uuid,
  'a1000000-0000-4000-8000-000000000007'::uuid,
  'a1000000-0000-4000-8000-000000000008'::uuid,
  'a1000000-0000-4000-8000-000000000009'::uuid,
  'a1000000-0000-4000-8000-000000000010'::uuid,
  'a1000000-0000-4000-8000-000000000011'::uuid,
  'a1000000-0000-4000-8000-000000000012'::uuid,
  'a1000000-0000-4000-8000-000000000013'::uuid,
  'a1000000-0000-4000-8000-000000000014'::uuid
);

create unique index if not exists projects_one_active_version_per_parent
  on public.projects (version_of)
  where version_of is not null and status in ('Em andamento', 'Planejamento');

create table if not exists public.project_claims (
  project_id uuid primary key references public.projects(id) on delete cascade,
  claimant_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.project_claims enable row level security;
revoke all on public.project_claims from public, anon, authenticated;

create or replace function public.claim_project(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  project_status text;
begin
  if auth.uid() is null then
    raise exception 'Entre com sua conta institucional para assumir este projeto.';
  end if;

  if not (
    lower(coalesce(auth.jwt() ->> 'email', '')) like '%@ifsc.edu.br'
    or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@aluno.ifsc.edu.br'
  ) then
    raise exception 'Use uma conta com e-mail institucional do IFSC para assumir projetos.';
  end if;

  select status into project_status
  from public.projects
  where id = target_project_id
  for update;

  if not found then
    raise exception 'Projeto não encontrado no acervo.';
  end if;

  if project_status = 'Em andamento' then
    raise exception 'Este projeto já está em andamento e não pode ser assumido novamente.';
  end if;

  if exists (
    select 1 from public.projects
    where version_of = target_project_id
      and status in ('Em andamento', 'Planejamento')
  ) then
    raise exception 'Este projeto já possui uma continuação em andamento.';
  end if;

  delete from public.project_claims
  where project_id = target_project_id and expires_at <= now();

  insert into public.project_claims (project_id, claimant_id, expires_at)
  values (target_project_id, auth.uid(), now() + interval '15 minutes');
exception
  when unique_violation then
    raise exception 'Este projeto já está sendo assumido por alguém. Tente novamente mais tarde.';
end;
$$;

create or replace function public.renew_project_claim(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.project_claims
  set expires_at = now() + interval '15 minutes'
  where project_id = target_project_id
    and claimant_id = auth.uid()
    and expires_at > now();

  if not found then
    raise exception 'A reserva deste projeto expirou. Volte ao acervo e tente assumir novamente.';
  end if;
end;
$$;

create or replace function public.release_project_claim(target_project_id uuid)
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from public.project_claims
  where project_id = target_project_id and claimant_id = auth.uid();
$$;

revoke all on function public.claim_project(uuid) from public, anon;
revoke all on function public.renew_project_claim(uuid) from public, anon;
revoke all on function public.release_project_claim(uuid) from public, anon;
grant execute on function public.claim_project(uuid) to authenticated;
grant execute on function public.renew_project_claim(uuid) to authenticated;
grant execute on function public.release_project_claim(uuid) to authenticated;

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
drop policy if exists "Project owners and admins can delete projects" on public.projects;
create policy "Project owners and admins can delete projects"
  on public.projects for delete to authenticated
  using (
    auth.uid() = owner_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'eduardo.r2008@aluno.ifsc.edu.br',
      'vinicius.amf20@aluno.ifsc.edu.br'
    )
  );

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
drop policy if exists "Project owners and admins can delete project attachments" on storage.objects;
create policy "Project owners and admins can delete project attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or lower(coalesce(auth.jwt() ->> 'email', '')) in (
        'eduardo.r2008@aluno.ifsc.edu.br',
        'vinicius.amf20@aluno.ifsc.edu.br'
      )
    )
  );