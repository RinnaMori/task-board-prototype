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

const getDueDateTextColor = (dueDate: string, status: Task["status"]) => {
    if (!dueDate) return "text-slate-400";
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

const getDueDateLabel = (dueDate: string) => {
    return dueDate || "未設定";
};

export function TaskCard({
    task,
    onEdit,
    onDelete,
    isDragging,
    onDragStart,
    onDragEnd,
}: TaskCardProps) {
    const latestHistory =
        task.assignment_history[task.assignment_history.length - 1];

    return (
        <article
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`cursor-grab rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition active:cursor-grabbing ${isDragging ? "opacity-40" : "opacity-100"
                }`}
        >
            {/* タイトル + 進捗 */}
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span
                        className={`h-2 w-2 shrink-0 rounded-full ${task.accentColor}`}
                    />
                    <span className="truncate text-sm font-bold text-slate-900">
                        {task.task_name || "名称未設定タスク"}
                    </span>
                </div>

                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                    {task.progress_pct}%
                </span>
            </div>

            {/* プロジェクト + 期日 */}
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {task.project_name || "その他"}
                </span>

                <span
                    className={`shrink-0 text-[10px] font-semibold ${getDueDateTextColor(
                        task.due_date,
                        task.status,
                    )}`}
                >
                    {getDueDateLabel(task.due_date)}
                </span>
            </div>

            {/* ステータス */}
            <div className="mb-1 flex items-center justify-between gap-2">
                <StatusBadge status={task.status} />

                <div className="text-[10px] text-slate-500 mt-1">
                    M: {task.manager} / L: {task.leader}
                </div>

                <div className="text-[10px] text-slate-500">
                    負荷: {task.capacity_pct}%
                </div>

                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={() => onEdit(task)}
                        className="rounded-md px-1.5 py-1 text-[10px] text-slate-500 hover:bg-slate-100"
                    >
                        編集
                    </button>

                    <button
                        type="button"
                        onClick={() => onDelete(task.task_id)}
                        className="rounded-md px-1.5 py-1 text-[10px] text-red-400 hover:bg-red-50"
                    >
                        削除
                    </button>
                </div>
            </div>

            {/* 内容（1行だけ） */}
            <p className="truncate text-[11px] text-slate-500">
                {task.description || "内容未設定"}
            </p>

            {/* 担当者遍歴（直近1件） */}
            {latestHistory && (
                <p className="mt-1 text-[10px] text-slate-400">
                    {latestHistory.from} → {latestHistory.to}
                </p>
            )}
        </article>
    );
}