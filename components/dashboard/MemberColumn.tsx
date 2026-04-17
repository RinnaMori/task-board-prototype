import { useState } from "react";
import type { Member, Task } from "@/types/dashboard";
import { ProgressBar } from "./ProgressBar";
import { TaskCard } from "./TaskCard";

type MemberColumnProps = {
    member: Member;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onDropTask: (targetMemberName: string) => void;
    draggingTaskId: string | null;
    onDragStartTask: (taskId: string) => void;
    onDragEndTask: () => void;
};

const progressColorMap: Record<string, string> = {
    "border-sky-400": "bg-sky-500",
    "border-emerald-400": "bg-emerald-500",
    "border-amber-400": "bg-amber-500",
    "border-purple-400": "bg-purple-500",
};

const avatarColorMap: Record<string, string> = {
    "border-sky-400": "bg-sky-100 text-sky-700",
    "border-emerald-400": "bg-emerald-100 text-emerald-700",
    "border-amber-400": "bg-amber-100 text-amber-700",
    "border-purple-400": "bg-purple-100 text-purple-700",
};

export function MemberColumn({
    member,
    onEditTask,
    onDeleteTask,
    onDropTask,
    draggingTaskId,
    onDragStartTask,
    onDragEndTask,
}: MemberColumnProps) {
    const progressColor = progressColorMap[member.columnColor] ?? "bg-sky-500";
    const avatarColor =
        avatarColorMap[member.columnColor] ?? "bg-slate-100 text-slate-700";

    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <section
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                onDropTask(member.member_name);
            }}
            className={`flex h-[720px] w-[248px] shrink-0 flex-col rounded-[22px] border border-slate-200 border-t-4 px-3 py-3 shadow-sm transition ${isDragOver ? "bg-sky-50 ring-2 ring-sky-300" : "bg-slate-50"
                } ${member.columnColor}`}
        >
            <div className="mb-3">
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor}`}
                        >
                            {member.initials}
                        </div>

                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold tracking-tight text-slate-900">
                                {member.member_name}
                            </h2>
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold text-slate-500">
                            キャパ
                        </p>
                        <p className="text-xl font-extrabold leading-none text-slate-900">
                            {member.capacity_pct}%
                        </p>
                    </div>
                </div>

                <div className="mb-2">
                    <ProgressBar value={member.capacity_pct} colorClass={progressColor} />
                </div>

                <div className="mb-3 flex justify-between gap-2 text-[10px] font-semibold text-slate-500">
                    <span>{member.capacity_label}</span>
                    <span>件数: {member.tasks.length}</span>
                </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {member.tasks.length > 0 ? (
                    member.tasks.map((task) => (
                        <TaskCard
                            key={task.task_id}
                            task={task}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            isDragging={draggingTaskId === task.task_id}
                            onDragStart={() => onDragStartTask(task.task_id)}
                            onDragEnd={onDragEndTask}
                        />
                    ))
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-4 text-center text-[11px] font-medium text-slate-400">
                        ここにドロップ
                    </div>
                )}
            </div>
        </section>
    );
}