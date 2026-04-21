-- ============================================
-- Step 1: Initial Supabase schema for task dashboard
-- ============================================

create extension if not exists pgcrypto;

-- ============================================
-- Updated at trigger function
-- ============================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================
-- Members
-- ============================================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_code text not null unique,
  member_name text not null unique,
  initials text not null default '',
  role text not null check (role in ('マネージャー', 'リーダー', '正社員', '業務委託')),
  capacity_pct integer not null default 0,
  capacity_label text not null default '0 件',
  due_today_count integer not null default 0,
  column_color text not null default 'border-slate-300',
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_members_updated_at
before update on public.members
for each row
execute function public.set_updated_at();

-- ============================================
-- Projects
-- ============================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  project_name text not null unique,
  color text not null check (
    color in (
      'blue',
      'green',
      'orange',
      'purple',
      'red',
      'cyan',
      'slate',
      'pink',
      'indigo',
      'teal',
      'lime',
      'amber',
      'rose'
    )
  ),
  accent_color text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

-- ============================================
-- Tasks
-- ============================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique,
  task_name text not null,
  project_id uuid references public.projects(id) on delete set null,
  project_name text not null,
  priority text not null check (priority in ('高', '中', '低')),
  status text not null check (status in ('未着手', '進行中', '完了', '保留')),
  progress_pct integer not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  manager_name text not null,
  leader_name text not null,
  assignee_name text not null,
  assigned_to text not null,
  capacity_pct integer not null default 0 check (capacity_pct >= 0 and capacity_pct <= 100),
  description text not null default '',
  flow_from text not null default '',
  flow_to text not null default '',
  accent_color text not null,
  color text not null check (
    color in (
      'blue',
      'green',
      'orange',
      'purple',
      'red',
      'cyan',
      'slate',
      'pink',
      'indigo',
      'teal',
      'lime',
      'amber',
      'rose'
    )
  ),
  due_date date,
  memo text not null default '',
  completed_at timestamptz null,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_member_id on public.tasks(member_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

create trigger trg_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

-- ============================================
-- Task assignment history
-- ============================================
create table if not exists public.task_assignment_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  from_member_name text not null,
  to_member_name text not null,
  assignment_role text not null check (
    assignment_role in ('Manager→Leader', 'Leader→担当者', '担当変更', '直接差配')
  ),
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_task_assignment_history_task_id
  on public.task_assignment_history(task_id);

create index if not exists idx_task_assignment_history_changed_at
  on public.task_assignment_history(changed_at desc);

-- ============================================
-- Member schedules
-- 1レコード = 1期間
-- ============================================
create table if not exists public.member_schedules (
  id uuid primary key default gen_random_uuid(),
  member_name text not null,
  work_style text not null check (work_style in ('オフィス', 'リモート', 'どちらも可')),
  weekday_monday boolean not null default false,
  weekday_tuesday boolean not null default false,
  weekday_wednesday boolean not null default false,
  weekday_thursday boolean not null default false,
  weekday_friday boolean not null default false,
  weekday_saturday boolean not null default false,
  weekday_sunday boolean not null default false,
  schedule_type text not null check (schedule_type in ('available', 'unavailable')),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_member_schedules_date_range check (start_date <= end_date)
);

create index if not exists idx_member_schedules_member_name
  on public.member_schedules(member_name);

create index if not exists idx_member_schedules_date_range
  on public.member_schedules(start_date, end_date);

create trigger trg_member_schedules_updated_at
before update on public.member_schedules
for each row
execute function public.set_updated_at();