-- ============================================
-- Step 2: Seed data based on current ZIP source
-- Files checked:
-- - data/mock-data.ts
-- - data/schedule-mock.ts
-- ============================================

begin;

-- --------------------------------------------
-- 0. Clear existing seed data in safe order
-- --------------------------------------------
delete from public.task_assignment_history;
delete from public.member_schedules;
delete from public.tasks;
delete from public.projects;
delete from public.members;

-- --------------------------------------------
-- 1. Members
-- role は ZIP の member_name から安全に対応付け
-- --------------------------------------------
insert into public.members (
  member_code,
  member_name,
  initials,
  role,
  capacity_pct,
  capacity_label,
  due_today_count,
  column_color,
  display_order,
  is_active
) values
  (
    'member-01',
    'マネージャー 山本',
    '山',
    'マネージャー',
    0,
    '0 件',
    0,
    'border-sky-400',
    1,
    true
  ),
  (
    'member-02',
    'リーダー 田中',
    '田',
    'リーダー',
    0,
    '0 件',
    0,
    'border-emerald-400',
    2,
    true
  ),
  (
    'member-03',
    '正社員 花子',
    '花',
    '正社員',
    0,
    '0 件',
    0,
    'border-amber-400',
    3,
    true
  ),
  (
    'member-04',
    'インターン A',
    'A',
    '業務委託',
    0,
    '0 件',
    0,
    'border-purple-400',
    4,
    true
  ),
  (
    'member-05',
    'インターン B',
    'B',
    '業務委託',
    0,
    '0 件',
    0,
    'border-rose-400',
    5,
    true
  ),
  (
    'member-06',
    'インターン C',
    'C',
    '業務委託',
    0,
    '0 件',
    0,
    'border-cyan-400',
    6,
    true
  );

-- --------------------------------------------
-- 2. Projects
-- --------------------------------------------
insert into public.projects (
  project_code,
  project_name,
  color,
  accent_color,
  display_order,
  is_active
) values
  (
    'project-01',
    'Webサイト更新',
    'blue',
    'bg-blue-500',
    1,
    true
  ),
  (
    'project-02',
    '競合調査',
    'green',
    'bg-green-500',
    2,
    true
  ),
  (
    'project-03',
    '営業支援',
    'orange',
    'bg-orange-500',
    3,
    true
  ),
  (
    'project-04',
    'データ整備',
    'cyan',
    'bg-cyan-500',
    4,
    true
  ),
  (
    'project-05',
    'その他',
    'slate',
    'bg-slate-500',
    5,
    true
  );

-- --------------------------------------------
-- 3. Tasks
-- task_code = 元の task_id
-- member_id / project_id は名前とコードで紐付け
-- --------------------------------------------
insert into public.tasks (
  task_code,
  task_name,
  project_id,
  project_name,
  priority,
  status,
  progress_pct,
  manager_name,
  leader_name,
  assignee_name,
  assigned_to,
  capacity_pct,
  description,
  flow_from,
  flow_to,
  accent_color,
  color,
  due_date,
  memo,
  completed_at,
  member_id
)
values
  (
    'T-001',
    'Webサイト更新',
    (select id from public.projects where project_code = 'project-01'),
    'Webサイト更新',
    '高',
    '進行中',
    55,
    'マネージャー 山本',
    'リーダー 田中',
    '正社員 花子',
    '正社員 花子',
    40,
    'LP改修と導線整理の実施',
    'リーダー 田中',
    '正社員 花子',
    'bg-blue-500',
    'blue',
    '2026-04-24',
    '先にデザイン確定版を確認',
    null,
    (select id from public.members where member_code = 'member-02')
  ),
  (
    'T-002',
    '競合調査レポート',
    (select id from public.projects where project_code = 'project-02'),
    '競合調査',
    '中',
    '未着手',
    0,
    'マネージャー 山本',
    'リーダー 田中',
    'インターン A',
    'インターン A',
    20,
    '主要3社の提案内容を比較表に整理',
    'リーダー 田中',
    'インターン A',
    'bg-green-500',
    'green',
    '2026-04-26',
    'テンプレート利用可',
    null,
    (select id from public.members where member_code = 'member-02')
  ),
  (
    'T-003',
    '月次データ集計',
    (select id from public.projects where project_code = 'project-04'),
    'データ整備',
    '高',
    '進行中',
    70,
    'マネージャー 山本',
    'リーダー 田中',
    '正社員 花子',
    '正社員 花子',
    35,
    '月次の実績を集計しダッシュボード反映',
    'リーダー 田中',
    '正社員 花子',
    'bg-cyan-500',
    'cyan',
    '2026-04-23',
    '営業実績シートと突合',
    null,
    (select id from public.members where member_code = 'member-03')
  ),
  (
    'T-004',
    '提案資料の更新',
    (select id from public.projects where project_code = 'project-03'),
    '営業支援',
    '中',
    '保留',
    20,
    'マネージャー 山本',
    'リーダー 田中',
    '正社員 花子',
    '正社員 花子',
    15,
    '顧客事例の差し替えと構成見直し',
    'リーダー 田中',
    '正社員 花子',
    'bg-orange-500',
    'orange',
    '2026-04-29',
    '顧客確認待ち',
    null,
    (select id from public.members where member_code = 'member-03')
  ),
  (
    'T-005',
    'SNS投稿作成',
    (select id from public.projects where project_code = 'project-03'),
    '営業支援',
    '低',
    '完了',
    100,
    'マネージャー 山本',
    'リーダー 田中',
    'インターン A',
    'インターン A',
    10,
    'SNS用のバナー文言と投稿文を作成',
    'リーダー 田中',
    'インターン A',
    'bg-orange-500',
    'orange',
    '2026-04-18',
    '完了後に承認依頼',
    '2026-04-18T12:00:00.000Z',
    (select id from public.members where member_code = 'member-04')
  ),
  (
    'T-006',
    '顧客リスト整理',
    (select id from public.projects where project_code = 'project-04'),
    'データ整備',
    '中',
    '進行中',
    40,
    'マネージャー 山本',
    'リーダー 田中',
    'インターン B',
    'インターン B',
    20,
    '重複顧客のマージと優先度整理',
    'リーダー 田中',
    'インターン B',
    'bg-cyan-500',
    'cyan',
    '2026-04-27',
    'CSV原本は共有ドライブ',
    null,
    (select id from public.members where member_code = 'member-05')
  );

-- --------------------------------------------
-- 4. Task assignment history
-- ZIP の assignment_history をそのまま投入
-- --------------------------------------------
insert into public.task_assignment_history (
  task_id,
  from_member_name,
  to_member_name,
  assignment_role,
  changed_at
)
values
  (
    (select id from public.tasks where task_code = 'T-001'),
    'マネージャー 山本',
    'リーダー 田中',
    'Manager→Leader',
    '2026-04-01T09:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-001'),
    'リーダー 田中',
    '正社員 花子',
    'Leader→担当者',
    '2026-04-01T10:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-002'),
    'マネージャー 山本',
    'リーダー 田中',
    'Manager→Leader',
    '2026-04-02T09:30:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-002'),
    'リーダー 田中',
    'インターン A',
    'Leader→担当者',
    '2026-04-02T10:15:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-003'),
    'マネージャー 山本',
    'リーダー 田中',
    'Manager→Leader',
    '2026-04-02T09:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-003'),
    'リーダー 田中',
    '正社員 花子',
    'Leader→担当者',
    '2026-04-02T10:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-004'),
    'マネージャー 山本',
    'リーダー 田中',
    'Manager→Leader',
    '2026-04-03T09:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-004'),
    'リーダー 田中',
    '正社員 花子',
    'Leader→担当者',
    '2026-04-03T11:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-005'),
    'マネージャー 山本',
    'リーダー 田中',
    'Manager→Leader',
    '2026-03-25T09:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-005'),
    'リーダー 田中',
    'インターン A',
    'Leader→担当者',
    '2026-03-25T10:00:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-006'),
    'マネージャー 山本',
    'リーダー 田中',
    'Manager→Leader',
    '2026-04-02T09:10:00.000Z'
  ),
  (
    (select id from public.tasks where task_code = 'T-006'),
    'リーダー 田中',
    'インターン B',
    'Leader→担当者',
    '2026-04-02T10:20:00.000Z'
  );

-- --------------------------------------------
-- 5. Member schedules
-- schedule-mock.ts の relative date を、実データと同じ考え方で
-- current_date 基準に変換して投入
-- --------------------------------------------
insert into public.member_schedules (
  member_name,
  work_style,
  weekday_monday,
  weekday_tuesday,
  weekday_wednesday,
  weekday_thursday,
  weekday_friday,
  weekday_saturday,
  weekday_sunday,
  schedule_type,
  start_date,
  end_date
)
values
  (
    'リーダー 田中',
    'オフィス',
    true, true, true, true, true, false, false,
    'available',
    current_date - 1,
    current_date + 2
  ),
  (
    '正社員 花子',
    'どちらも可',
    true, true, true, true, true, false, false,
    'available',
    current_date + 1,
    current_date + 4
  ),
  (
    'インターン A',
    'リモート',
    true, false, true, false, true, false, false,
    'available',
    current_date - 2,
    current_date + 1
  ),
  (
    'インターン A',
    'リモート',
    true, false, true, false, true, false, false,
    'unavailable',
    current_date + 3,
    current_date + 5
  ),
  (
    'インターン B',
    'オフィス',
    false, true, false, true, false, false, false,
    'unavailable',
    current_date - 1,
    current_date + 1
  ),
  (
    'インターン C',
    'どちらも可',
    true, false, false, true, true, false, false,
    'available',
    current_date + 2,
    current_date + 6
  );

commit;