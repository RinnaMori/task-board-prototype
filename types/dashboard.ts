export type TaskStatus = "未着手" | "進行中" | "完了" | "保留";

export type TaskPriority = "高" | "中" | "低";

export type TaskColor =
    | "blue"
    | "green"
    | "orange"
    | "purple"
    | "red"
    | "cyan"
    | "slate"
    | "pink"
    | "indigo"
    | "teal"
    | "lime"
    | "amber"
    | "rose";

export type MemberRole = "Lead" | "正社員" | "業務委託";

export type AssignmentRole =
    | "Lead→担当者"
    | "Manager→Leader"
    | "Leader→担当者"
    | "担当変更"
    | "担当者追加"
    | "担当者解除"
    | "直接差配"
    | "初期担当";

export type AssignmentHistoryItem = {
    from: string;
    to: string;
    role: AssignmentRole;
    changed_at: string;
};

export type Task = {
    task_id: string;
    task_name: string;
    project_name: string;
    priority: TaskPriority;
    status: TaskStatus;
    progress_pct: number;
    manager: string;
    leader: string;
    assignee: string;
    capacity_pct: number;
    capacity_by_assignee?: Record<string, number>;
    assigned_to: string;
    description: string;
    flow_from: string;
    flow_to: string;
    accentColor: string;
    color: TaskColor;
    due_date: string;
    memo: string;
    completed_at?: string | null;
    updated_at?: string | null;
    assignment_history: AssignmentHistoryItem[];
};

export type Member = {
    member_id: string;
    member_name: string;
    role: MemberRole;
    initials: string;
    capacity_pct: number;
    capacity_label: string;
    due_today_count: number;
    columnColor: string;
    tasks: Task[];
};

export type Project = {
    project_id: string;
    project_name: string;
    color: TaskColor;
    accentColor: string;
};

export type NewTaskInput = {
    task_name: string;
    project_name: string;
    priority: TaskPriority;
    description: string;
    manager: string;
    leader: string;
    assignee: string;
    capacity_pct: number;
    capacity_by_assignee: Record<string, number>;
    due_date: string;
    memo: string;
};

export type UpdateTaskInput = {
    task_id: string;
    task_name: string;
    project_name: string;
    priority: TaskPriority;
    description: string;
    due_date: string;
    memo: string;
    status: TaskStatus;
    progress_pct: number;
    manager: string;
    leader: string;
    assignee: string;
    capacity_pct: number;
    capacity_by_assignee: Record<string, number>;
};

export type DashboardStore = {
    members: Member[];
    projects: Project[];
};

export type MemberStatusSummary = {
    member_name: string;
    role: MemberRole;
    未着手: number;
    進行中: number;
    完了: number;
    保留: number;
    合計: number;
};

export type AssignmentMatrixRow = {
    from: string;
    to: string;
    count: number;
};

export type FlowTableRow = {
    task_id: string;
    task_name: string;
    manager: string;
    leader: string;
    assignee: string;
    current_from: string;
    current_to: string;
    status: TaskStatus;
    due_date: string;
    completed_at?: string | null;
};

export type FlowLogRow = {
    log_id: string;
    changed_at: string;
    task_id: string;
    task_name: string;
    from: string;
    to: string;
    role: AssignmentRole;
    manager: string;
    leader: string;
    assignee: string;
    status: TaskStatus;
};