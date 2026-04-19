export type TaskStatus = "未着手" | "進行中" | "完了" | "保留";

export type TaskPriority = "高" | "中" | "低";

export type TaskColor =
    | "blue"
    | "green"
    | "orange"
    | "purple"
    | "red"
    | "cyan"
    | "slate";

export type AssignmentRole =
    | "Manager→Leader"
    | "Leader→担当者"
    | "担当変更"
    | "直接差配";

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
    assigned_to: string;

    description: string;

    flow_from: string;
    flow_to: string;

    accentColor: string;
    color: TaskColor;

    due_date: string;
    memo: string;

    assignment_history: AssignmentHistoryItem[];
};

export type Member = {
    member_id: string;
    member_name: string;
    initials: string;
    capacity_pct: number;
    capacity_label: string;
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
};

export type DashboardStore = {
    members: Member[];
    projects: Project[];
};

export type MemberStatusSummary = {
    member_name: string;
    未着手: number;
    進行中: number;
    完了: number;
    保留: number;
    合計: number;
};

export type FlowRow = {
    task_id: string;
    task_name: string;
    manager: string;
    leader: string;
    assignee: string;
    latest_flow: string;
    delegated_at: string;
    status: TaskStatus;
};