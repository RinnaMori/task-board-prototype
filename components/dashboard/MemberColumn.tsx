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
    const avatarColor = avatarColorMap[member.columnColor] ?? "bg-slate-100 text-slate-700";
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <section
            onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                onDropTask(member.member_name);
            }}
            className={`flex h-[720px] w-[296px] shrink-0 flex-col rounded-[24px] border border-slate-200 border-t-4 px-4 py-4 shadow-sm transition ${isDragOver ? "bg-sky-50 ring-2 ring-sky-300" : "bg-slate-50"
                } ${member.columnColor}`}
        >
            <div className="mb-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor}`}>
                            {member.initials}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-bold text-slate-900">{member.member_name}</h2>
                            <p className="text-xs font-medium text-slate-500">進行中キャパ合計</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[11px] font-semibold text-slate-500">負荷</p>
                        <p className="text-2xl font-extrabold leading-none text-slate-900">{member.capacity_pct}%</p>
                    </div>
                </div>

                <ProgressBar value={member.capacity_pct} colorClass={progressColor} />

                <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>{member.capacity_label}</span>
                    <span>タスク数 {member.tasks.length}</span>
                </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
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
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-center text-sm font-medium text-slate-400">
                        タスクなし / ここにドロップ
                    </div>
                )}
            </div>
        </section>
    );
}