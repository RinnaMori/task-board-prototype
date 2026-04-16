export type TaskStatus = "未着手" | "進行中" | "完了" | "保留";

export type TaskColor =
    | "blue"
    | "green"
    | "orange"
    | "purple"
    | "red"
    | "yellow"
    | "cyan";

export type AssignmentHistoryItem = {
    from: string;
    to: string;
    changed_at: string;
};

export type Task = {
    task_id: string;
    task_name: string;
    status: TaskStatus;
    progress_pct: number;
    assigned_to: string;
    description: string;
    flow_from: string;
    flow_to: string;
    accentColor: string;
    due_date: string;
    memo: string;
    color: TaskColor;
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

export type NewTaskInput = {
    task_name: string;
    description: string;
    assigned_to: string;
    due_date: string;
    memo: string;
    color: TaskColor;
};

export type UpdateTaskInput = {
    task_id: string;
    task_name: string;
    description: string;
    due_date: string;
    memo: string;
    color: TaskColor;
    status: TaskStatus;
    progress_pct: number;
};