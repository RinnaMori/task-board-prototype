"use client";

import type { Task } from "@/types/dashboard";
import {
    formatDateTimeLabel,
    getDueLabel,
    getDueTextClass,
    isOverdue,
    isTaskRecentlyCompleted,
} from "@/lib/dashboard-store";
import { PriorityBadge, StatusBadge } from "./StatusBadge";

type TaskCardProps = {
    task: Task;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    onComplete: (taskId: string) => void;
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
};

export function TaskCard({
    task,
    onEdit,
    onDelete,
    onComplete,
    isDragging,
    onDragStart,
    onDragEnd,
}: TaskCardProps) {
    const latestHistory = task.assignment_history[task.assignment_history.length - 1];
    const overdue = isOverdue(task);
    const recentlyCompleted = isTaskRecentlyCompleted(task);
    const isCompleted = task.status === "完了";

    return (
        <article
            draggable={!isCompleted}
            onDragStart={isCompleted ? undefined : onDragStart}
            onDragEnd={isCompleted ? undefined : onDragEnd}
            className={`rounded-2xl border px-3 py-3 shadow-sm transition ${isDragging ? "opacity-40" : "opacity-100"
                } ${isCompleted
                    ? "border-slate-200 bg-slate-100 text-slate-500"
                    : "border-slate-200 bg-white cursor-grab active:cursor-grabbing"
                }`}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500">{task.task_id}</p>
                    <h3
                        className={`mt-1 line-clamp-2 text-sm font-bold ${isCompleted ? "text-slate-500 line-through" : "text-slate-900"
                            }`}
                    >
                        {task.task_name}
                    </h3>
                </div>
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${task.accentColor}`} />
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {recentlyCompleted ? (
                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        完了済み
                    </span>
                ) : null}
            </div>

            <dl className="space-y-1.5 text-[12px] text-slate-600">
                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">担当</dt>
                    <dd className="truncate text-right font-semibold text-slate-800">{task.assignee || "未選択"}</dd>
                </div>

                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">期日</dt>
                    <dd className={`font-semibold ${getDueTextClass(task)}`}>{getDueLabel(task.due_date)}</dd>
                </div>

                <div className="flex justify-between gap-2">
                    <dt className="font-semibold text-slate-500">進捗</dt>
                    <dd className="font-semibold text-slate-800">{task.progress_pct}%</dd>
                </div>
            </dl>

            {overdue ? (
                <p className="mt-3 rounded-xl bg-red-50 px-2.5 py-2 text-[11px] font-bold text-red-700">
                    期日超過タスク
                </p>
            ) : null}

            {isCompleted && task.completed_at ? (
                <p className="mt-3 rounded-xl bg-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-700">
                    完了日時: {formatDateTimeLabel(task.completed_at)}
                </p>
            ) : null}

            <div className="mt-3 rounded-xl bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-700">最新差配</p>
                <p className="mt-1 line-clamp-2">
                    {latestHistory
                        ? `${latestHistory.from} → ${latestHistory.to}`
                        : `${task.flow_from || "未設定"} → ${task.flow_to || "未設定"}`}
                </p>
            </div>

            <div className="mt-3 flex gap-1.5">
                {!isCompleted ? (
                    <button
                        type="button"
                        onClick={() => onComplete(task.task_id)}
                        className="rounded-xl border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-50"
                    >
                        完了
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={() => onEdit(task)}
                    className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    編集
                </button>

                <button
                    type="button"
                    onClick={() => onDelete(task.task_id)}
                    className="rounded-xl border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50"
                >
                    削除
                </button>
            </div>
        </article>
    );
}