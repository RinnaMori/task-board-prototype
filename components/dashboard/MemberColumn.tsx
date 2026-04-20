"use client";

import { useEffect, useState } from "react";
import type { Member, Task } from "@/types/dashboard";
import { getTodayStatus, loadScheduleStore } from "@/lib/schedule-utils";
import { inferRoleFromName, sortTasksForDashboard } from "@/lib/dashboard-store";
import type { ScheduleType } from "@/types/schedule";
import { MemberScheduleDetailModal } from "./MemberScheduleDetailModal";
import { TaskCard } from "./TaskCard";

type MemberColumnProps = {
    member: Member;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onCompleteTask: (taskId: string) => void;
    onDeleteMember: (memberId: string) => void;
    onDropTask: (targetMemberName: string) => void;
    draggingTaskId: string | null;
    onDragStartTask: (taskId: string) => void;
    onDragEndTask: () => void;
};

const avatarColorMap: Record<string, string> = {
    "border-sky-400": "bg-sky-100 text-sky-700",
    "border-emerald-400": "bg-emerald-100 text-emerald-700",
    "border-amber-400": "bg-amber-100 text-amber-700",
    "border-purple-400": "bg-purple-100 text-purple-700",
    "border-rose-400": "bg-rose-100 text-rose-700",
    "border-pink-400": "bg-pink-100 text-pink-700",
    "border-cyan-400": "bg-cyan-100 text-cyan-700",
    "border-indigo-400": "bg-indigo-100 text-indigo-700",
    "border-lime-400": "bg-lime-100 text-lime-700",
    "border-slate-400": "bg-slate-100 text-slate-700",
};

const roleBadgeMap: Record<string, string> = {
    マネージャー: "bg-sky-100 text-sky-700",
    リーダー: "bg-emerald-100 text-emerald-700",
    正社員: "bg-amber-100 text-amber-700",
    業務委託: "bg-purple-100 text-purple-700",
};

function TodayStatusBadge({ status }: { status: ScheduleType | null }) {
    if (status === "available") {
        return (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                今日 ⭕
            </span>
        );
    }

    if (status === "unavailable") {
        return (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                今日 ❌
            </span>
        );
    }

    return null;
}

export function MemberColumn({
    member,
    onEditTask,
    onDeleteTask,
    onCompleteTask,
    onDeleteMember,
    onDropTask,
    draggingTaskId,
    onDragStartTask,
    onDragEndTask,
}: MemberColumnProps) {
    const avatarColor = avatarColorMap[member.columnColor] ?? "bg-slate-100 text-slate-700";
    const inferredRole = inferRoleFromName(member.member_name);
    const roleBadge = roleBadgeMap[inferredRole] ?? "bg-slate-100 text-slate-700";
    const [isDragOver, setIsDragOver] = useState(false);
    const [todayStatus, setTodayStatus] = useState<ScheduleType | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        const syncStatus = () => {
            const store = loadScheduleStore();
            setTodayStatus(getTodayStatus(member.member_name, store.members));
        };

        syncStatus();
        window.addEventListener("storage", syncStatus);
        window.addEventListener("schedule-store-updated", syncStatus as EventListener);

        return () => {
            window.removeEventListener("storage", syncStatus);
            window.removeEventListener("schedule-store-updated", syncStatus as EventListener);
        };
    }, [member.member_name]);

    const sortedTasks = sortTasksForDashboard(member.tasks);

    return (
        <>
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
                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(true)}
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor}`}
                            >
                                {member.initials}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(true)}
                                className="min-w-0 text-left"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="truncate text-base font-bold text-slate-900">{member.member_name}</h2>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadge}`}>
                                        {inferredRole}
                                    </span>
                                    <TodayStatusBadge status={todayStatus} />
                                </div>
                                <p className="text-xs font-medium text-slate-500">期日が今日のタスク数</p>
                            </button>
                        </div>

                        <div className="flex shrink-0 items-start gap-2">
                            <div className="text-right">
                                <p className="text-[11px] font-semibold text-slate-500">当日件数</p>
                                <p className="text-2xl font-extrabold leading-none text-slate-900">{member.due_today_count}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onDeleteMember(member.member_id)}
                                className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50"
                            >
                                削除
                            </button>
                        </div>
                    </div>

                    <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>{member.capacity_label}</span>
                        <span>表示中 {sortedTasks.length} 件</span>
                    </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {sortedTasks.length > 0 ? (
                        sortedTasks.map((task) => (
                            <TaskCard
                                key={task.task_id}
                                task={task}
                                onEdit={onEditTask}
                                onDelete={onDeleteTask}
                                onComplete={onCompleteTask}
                                isDragging={draggingTaskId === task.task_id}
                                onDragStart={() => onDragStartTask(task.task_id)}
                                onDragEnd={onDragEndTask}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-center text-sm font-medium text-slate-400">
                            表示対象タスクなし / ここにドロップ
                        </div>
                    )}
                </div>
            </section>

            <MemberScheduleDetailModal
                isOpen={isDetailOpen}
                memberName={member.member_name}
                onClose={() => setIsDetailOpen(false)}
            />
        </>
    );
}