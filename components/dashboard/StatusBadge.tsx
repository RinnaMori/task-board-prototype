import type { TaskPriority, TaskStatus } from "@/types/dashboard";

type StatusBadgeProps = {
    status: TaskStatus;
};

type PriorityBadgeProps = {
    priority: TaskPriority;
};

const statusClassMap: Record<TaskStatus, string> = {
    未着手: "bg-slate-100 text-slate-700",
    進行中: "bg-blue-100 text-blue-700",
    完了: "bg-emerald-100 text-emerald-700",
    保留: "bg-amber-100 text-amber-700",
};

const priorityClassMap: Record<TaskPriority, string> = {
    高: "bg-rose-100 text-rose-700",
    中: "bg-violet-100 text-violet-700",
    低: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClassMap[status]}`}
        >
            {status}
        </span>
    );
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${priorityClassMap[priority]}`}
        >
            優先度 {priority}
        </span>
    );
}