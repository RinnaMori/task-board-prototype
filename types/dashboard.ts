export type TaskStatus = "未着手" | "進行中" | "完了" | "保留";

export type TaskColor =
    | "blue"
    | "green"
    | "orange"
    | "purple"
    | "red"
    | "cyan"
    | "slate";

export type AssignmentHistoryItem = {
    from: string;
    to: string;
    changed_at: string;
};

export type Task = {
    task_id: string;
    task_name: string;
    project_name: string;
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
    description: string;
    assigned_to: string;

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