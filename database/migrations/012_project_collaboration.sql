-- Project proposals, project-scoped team membership, applications, invitations,
-- milestones, and review records for member-authored public updates.

do $$ begin
  create type public.project_proposal_status as enum ('PENDING','APPROVED','REJECTED','WITHDRAWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_membership_role as enum ('LEAD','MEMBER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_membership_status as enum ('ACTIVE','LEFT','REMOVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_application_status as enum ('PENDING','ACCEPTED','REJECTED','WITHDRAWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_invite_status as enum ('PENDING','ACCEPTED','DECLINED','REVOKED','EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_milestone_status as enum ('TODO','IN_PROGRESS','BLOCKED','DONE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_update_review_status as enum ('PENDING_REVIEW','APPROVED_FOR_PUBLISH','CHANGES_REQUESTED','REJECTED');
exception when duplicate_object then null; end $$;

create table if not exists public.project_proposals (
  id uuid primary key default gen_random_uuid(),
  proposer_user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  title text not null,
  problem text not null,
  goal text not null,
  summary text not null default '',
  disciplines text[] not null default '{}',
  recruiting_needs text not null default '',
  links jsonb not null default '[]'::jsonb,
  status public.project_proposal_status not null default 'PENDING',
  admin_feedback text,
  reviewed_by uuid references public.admin_profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  approved_project_id uuid unique references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(char_length(trim(title)) between 3 and 160),
  check(char_length(trim(problem)) >= 10),
  check(char_length(trim(goal)) >= 10)
);
create index if not exists project_proposals_status_idx on public.project_proposals(status,created_at desc);
create index if not exists project_proposals_member_idx on public.project_proposals(proposer_user_id,created_at desc);

create table if not exists public.project_team_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  unique(project_id,name)
);

create table if not exists public.project_memberships (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  role public.project_membership_role not null default 'MEMBER',
  team_role_id uuid references public.project_team_roles(id) on delete set null,
  status public.project_membership_status not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create index if not exists project_memberships_user_idx on public.project_memberships(user_id,status);
create index if not exists project_memberships_project_idx on public.project_memberships(project_id,status,role);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status public.project_milestone_status not null default 'TODO',
  due_date date,
  sort_order integer not null default 100,
  created_by uuid references public.member_profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_milestones_project_idx on public.project_milestones(project_id,sort_order,created_at);

create table if not exists public.project_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  applicant_user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  motivation text not null,
  skills text[] not null default '{}',
  status public.project_application_status not null default 'PENDING',
  reviewed_by_user_id uuid references public.member_profiles(user_id) on delete set null,
  reviewed_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(char_length(trim(motivation)) >= 10)
);
create unique index if not exists project_applications_open_idx on public.project_applications(project_id,applicant_user_id) where status='PENDING';
create index if not exists project_applications_project_idx on public.project_applications(project_id,status,created_at desc);
create index if not exists project_applications_member_idx on public.project_applications(applicant_user_id,created_at desc);

create table if not exists public.project_team_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  invited_by_user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  role public.project_membership_role not null default 'MEMBER' check(role='MEMBER'),
  message text not null default '',
  status public.project_invite_status not null default 'PENDING',
  expires_at timestamptz not null default (now()+interval '14 days'),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(invited_user_id<>invited_by_user_id)
);
create unique index if not exists project_team_invites_open_idx on public.project_team_invites(project_id,invited_user_id) where status='PENDING';
create index if not exists project_team_invites_target_idx on public.project_team_invites(invited_user_id,status,created_at desc);

create table if not exists public.project_update_reviews (
  id uuid primary key default gen_random_uuid(),
  project_update_id uuid not null unique references public.project_updates(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  submitted_by_user_id uuid not null references public.member_profiles(user_id) on delete cascade,
  status public.project_update_review_status not null default 'PENDING_REVIEW',
  reviewed_by uuid references public.admin_profiles(user_id) on delete set null,
  review_feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists project_update_reviews_status_idx on public.project_update_reviews(status,submitted_at desc);
create index if not exists project_update_reviews_project_idx on public.project_update_reviews(project_id,submitted_at desc);

alter table public.project_proposals enable row level security;
alter table public.project_team_roles enable row level security;
alter table public.project_memberships enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_applications enable row level security;
alter table public.project_team_invites enable row level security;
alter table public.project_update_reviews enable row level security;

drop trigger if exists set_updated_at on public.project_proposals;
create trigger set_updated_at before update on public.project_proposals for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.project_memberships;
create trigger set_updated_at before update on public.project_memberships for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.project_milestones;
create trigger set_updated_at before update on public.project_milestones for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.project_applications;
create trigger set_updated_at before update on public.project_applications for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.project_team_invites;
create trigger set_updated_at before update on public.project_team_invites for each row execute function private.set_updated_at();
drop trigger if exists set_updated_at on public.project_update_reviews;
create trigger set_updated_at before update on public.project_update_reviews for each row execute function private.set_updated_at();
