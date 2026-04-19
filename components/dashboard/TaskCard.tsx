import type { Task } from "@/types/dashboard";
import { getDueLabel, getDueTextClass, isOverdue } from "@/lib/dashboard-store";
import { PriorityBadge, StatusBadge } from "./StatusBadge";

type TaskCardProps = {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
};

export function TaskCard({
    task,
    onEdit,
    onDelete,
    isDragging,
    onDragStart,
    onDragEnd,
}: TaskCardProps) {
    const latestHistory = task.assignment_history[task.assignment_history.length - 1];
    const overdue = isOverdue(task);

    return (
        <article
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`cursor-grab rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition active:cursor-grabbing ${isDragging ? "opacity-40" : "opacity-100"
                }`}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500">{task.task_id}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">
                        {task.task_name}
                    </h3>
                </div>
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${task.accentColor}`} />
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
            </div>

            <dl className="space-y-1.5 text-[12px] text-slate-600">
                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">担当</dt>
                    <dd className="truncate text-right font-semibold text-slate-800">
                        {task.assignee}
                    </dd>
                </div>

                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">キャパ</dt>
                    <dd className="font-semibold text-slate-800">{task.capacity_pct}%</dd>
                </div>

                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">進捗</dt>
                    <dd className="font-semibold text-slate-800">{task.progress_pct}%</dd>
                </div>

                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">期日</dt>
                    <dd className={`font-semibold ${getDueTextClass(task)}`}>
                        {getDueLabel(task.due_date)}
                    </dd>
                </div>
            </dl>

            {overdue ? (
                <p className="mt-3 rounded-xl bg-red-50 px-2.5 py-2 text-[11px] font-bold text-red-700">
                    期日超過タスク
                </p>
            ) : null}

            <div className="mt-3 rounded-xl bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-700">最新差配</p>
                <p className="mt-1 line-clamp-2">
                    {latestHistory
                        ? `${latestHistory.from} → ${latestHistory.to} / ${latestHistory.changed_at}`
                        : `${task.flow_from} → ${task.flow_to}`}
                </p>
            </div>

            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    編集
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(task.task_id)}
                    className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                    削除
                </button>
            </div>
        </article>
    );
}