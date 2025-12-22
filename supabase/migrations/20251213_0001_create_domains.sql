create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  domain text not null unique,
  created_at timestamptz not null default now()
);

alter table public.domains enable row level security;

do $$
begin
  create policy "Users can manage their own domains"
  on public.domains
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create index if not exists domains_user_id_idx on public.domains(user_id);
create index if not exists domains_website_id_idx on public.domains(website_id);
create index if not exists domains_domain_idx on public.domains(domain);
