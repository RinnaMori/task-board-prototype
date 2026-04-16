import type { Task } from "@/types/dashboard";
import { StatusBadge } from "./StatusBadge";

type TaskCardProps = {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
};

const memoLimitLabel = (memo: string) => {
    if (memo.length <= 30) return memo;
    return `${memo.slice(0, 30)}...`;
};

const getDueDateTextColor = (dueDate: string, status: Task["status"]) => {
    if (status === "完了") return "text-slate-500";

    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffDays =
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) return "text-red-500";
    if (diffDays <= 3) return "text-amber-500";

    return "text-slate-500";
};

export function TaskCard({
    task,
    onEdit,
    onDelete,
    isDragging,
    onDragStart,
    onDragEnd,
}: TaskCardProps) {
    return (
        <article
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`cursor-grab rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition active:cursor-grabbing ${isDragging ? "opacity-40" : "opacity-100"
                }`}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${task.accentColor}`}
                        aria-hidden="true"
                    />
                    <div className="min-w-0">
                        <h3 className="truncate text-base font-bold leading-none tracking-tight text-slate-900">
                            {task.task_name}
                        </h3>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {task.progress_pct}%
                    </span>
                </div>
            </div>

            <div className="mb-3 flex flex-col gap-2">
                <StatusBadge status={task.status} />
                <span
                    className={`text-[11px] font-semibold ${getDueDateTextColor(
                        task.due_date,
                        task.status,
                    )}`}
                >
                    期日: {task.due_date}
                </span>
            </div>

            <p className="mb-3 text-xs font-medium leading-5 text-slate-600">
                {task.description}
            </p>

            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-slate-500">メモ</p>
                <p className="mt-1 text-xs leading-5 text-slate-700">
                    {memoLimitLabel(task.memo)}
                </p>
            </div>

            <div className="space-y-1.5 text-xs leading-5 text-slate-500">
                <p>
                    <span className="font-medium text-slate-600">担当者:</span>{" "}
                    {task.assigned_to}
                </p>
                <p>
                    <span className="font-medium text-slate-600">差配:</span>{" "}
                    {task.flow_from} → {task.flow_to}
                </p>
            </div>

            {task.assignment_history.length > 0 && (
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-slate-500">担当者遍歴</p>
                    <div className="mt-1 space-y-1">
                        {task.assignment_history.map((history, index) => (
                            <p key={`${history.changed_at}-${index}`} className="text-[11px] leading-4 text-slate-600">
                                {history.from} → {history.to}
                            </p>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-2 flex gap-1.5">
                <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100"
                >
                    編集
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(task.task_id)}
                    className="rounded-md px-1.5 py-1 text-[10px] font-medium text-red-400 transition hover:bg-red-50"
                >
                    削除
                </button>
            </div>
        </article>
    );
}