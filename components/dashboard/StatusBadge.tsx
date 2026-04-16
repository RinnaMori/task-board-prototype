import type { TaskStatus } from "@/types/dashboard";

type StatusBadgeProps = {
    status: TaskStatus;
};

const statusStyles: Record<TaskStatus, string> = {
    未着手: "bg-slate-100 text-slate-700",
    進行中: "bg-blue-50 text-blue-700",
    完了: "bg-emerald-50 text-emerald-700",
    保留: "bg-amber-50 text-amber-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
        >
            {status}
        </span>
    );
}