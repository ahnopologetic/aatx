-- Supabase SQL for organizations, members, invitations, and profile current_org_id

create table  public.organizations (
  id uuid primary key,
  name text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.organizations enable row level security;

create table  public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')) default 'member',
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

alter table public.organization_members enable row level security;

create table  public.organization_invitations (
  id uuid primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token uuid not null unique,
  status text not null check (status in ('pending','accepted','revoked')) default 'pending',
  invited_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz
);

alter table public.organization_invitations enable row level security;

-- Add current_org_id to profiles
do $$ begin
  alter table public.profiles add column  current_org_id uuid references public.organizations(id) on delete set null;
exception when duplicate_column then null; end $$;

-- RLS Policies
create policy  orgs_select on public.organizations
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organizations.id and m.user_id = auth.uid()
    )
  );

create policy  orgs_insert on public.organizations
  for insert with check (created_by = auth.uid());

create policy  orgs_update on public.organizations
  for update using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = organizations.id and m.user_id = auth.uid() and m.role in ('owner','admin')
    )
  );

create policy  members_select on public.organization_members
  for select using (
    user_id = auth.uid()
  );

create policy members_insert on public.organization_members
  for insert with check (
    user_id = auth.uid()
  );

create policy invitations_select on public.organization_invitations
  for select using (
    invited_by = auth.uid() or email = auth.email()
  );

create policy  invitations_insert on public.organization_invitations
  for insert with check (
    exists (
      select 1 from public.organization_members m where m.org_id = organization_invitations.org_id and m.user_id = auth.uid() and m.role in ('owner','admin')
    )
  );

create policy invitations_update on public.organization_invitations
  for update using (
    invited_by = auth.uid() or email = auth.email()
  );


