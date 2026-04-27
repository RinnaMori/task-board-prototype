"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Member, Task } from "@/types/dashboard";
import { sortTasksForDashboard } from "@/lib/dashboard-store";
import { fetchSupabaseScheduleStore } from "@/lib/supabase/schedule-store";
import type { MemberSchedule, ScheduleType } from "@/types/schedule";
import { TaskCard } from "./TaskCard";

type MemberColumnProps = {
    member: Member;
    totalCapacityPct: number;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onCompleteTask: (taskId: string) => void;
    onDeleteMember: (memberId: string) => void;
    onDropTask: (targetMemberName: string) => void;
    draggingTaskId: string | null;
    onDragStartTask: (taskId: string, sourceMemberName: string) => void;
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
    Lead: "bg-sky-100 text-sky-700",
    正社員: "bg-amber-100 text-amber-700",
    業務委託: "bg-purple-100 text-purple-700",
};

function TodayStatusBadge({ status }: { status: ScheduleType | null }) {
    if (status === "available") {
        return <span className="text-[10px] font-bold text-emerald-600">⭕</span>;
    }
    if (status === "unavailable") {
        return <span className="text-[10px] font-bold text-rose-600">❌</span>;
    }
    return <span className="text-[10px] font-bold text-slate-400">-</span>;
}

function getStatusLabel(status: ScheduleType | null) {
    if (status === "available") return "⭕ 稼働可能";
    if (status === "unavailable") return "❌ 稼働不可";
    return "未申告";
}

function getRangeTypeLabel(type: ScheduleType) {
    return type === "available" ? "稼働可能" : "稼働不可";
}

function getTodayStatusFromMemberSchedule(schedule: MemberSchedule | null): ScheduleType | null {
    if (!schedule) return null;

    const today = new Date().toISOString().slice(0, 10);

    const unavailable = schedule.schedules.find(
        (range) => range.type === "unavailable" && range.start_date <= today && today <= range.end_date,
    );
    if (unavailable) return "unavailable";

    const available = schedule.schedules.find(
        (range) => range.type === "available" && range.start_date <= today && today <= range.end_date,
    );
    if (available) return "available";

    return null;
}

function SchedulePopover({
    schedule,
    todayStatus,
}: {
    schedule: MemberSchedule | null;
    todayStatus: ScheduleType | null;
}) {
    return (
        <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3">
                <div className="text-xs font-bold text-slate-500">今日の状態</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{getStatusLabel(todayStatus)}</div>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div>
                    <div className="text-xs font-bold text-slate-500">勤務形態</div>
                    <div className="mt-1 text-sm text-slate-900">
                        {schedule?.work_style ?? "どちらも可"}
                    </div>
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-500">稼働曜日</div>
                    <div className="mt-1 text-sm text-slate-900">
                        {schedule && schedule.weekdays.length > 0
                            ? schedule.weekdays.join("・")
                            : "未設定"}
                    </div>
                </div>
            </div>

            <div>
                <div className="mb-2 text-xs font-bold text-slate-500">申告済みスケジュール</div>
                {schedule && schedule.schedules.length > 0 ? (
                    <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                        {schedule.schedules.map((range, index) => (
                            <div
                                key={`${range.id ?? "noid"}-${range.type}-${range.start_date}-${range.end_date}-${index}`}
                                className="rounded-xl bg-slate-50 px-3 py-2"
                            >
                                <div className="text-xs font-bold text-slate-700">
                                    {getRangeTypeLabel(range.type)}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                    {range.start_date} 〜 {range.end_date}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                        申告済みスケジュールはありません
                    </div>
                )}
            </div>
        </div>
    );
}

export function MemberColumn({
    member,
    totalCapacityPct,
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
    const role = member.role;
    const roleBadge = roleBadgeMap[role] ?? "bg-slate-100 text-slate-700";

    const [todayStatus, setTodayStatus] = useState<ScheduleType | null>(null);
    const [memberSchedule, setMemberSchedule] = useState<MemberSchedule | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);

    const popoverRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let active = true;

        const syncStatus = async () => {
            try {
                const result = await fetchSupabaseScheduleStore([member.member_name]);
                if (!active) return;

                const found = result.members[0] ?? null;
                setMemberSchedule(found);
                setTodayStatus(getTodayStatusFromMemberSchedule(found));
            } catch (error) {
                console.error("❌ dashboard schedule取得失敗", error);
                if (!active) return;
                setMemberSchedule(null);
                setTodayStatus(null);
            }
        };

        const handleScheduleUpdated = () => {
            void syncStatus();
        };

        const handleFocus = () => {
            void syncStatus();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void syncStatus();
            }
        };

        void syncStatus();
        window.addEventListener("schedule-store-updated", handleScheduleUpdated);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            active = false;
            window.removeEventListener("schedule-store-updated", handleScheduleUpdated);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [member.member_name]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!popoverRef.current) return;
            if (!popoverRef.current.contains(event.target as Node)) {
                setIsScheduleOpen(false);
            }
        };

        if (isScheduleOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isScheduleOpen]);

    const sortedTasks = useMemo(() => sortTasksForDashboard(member.tasks), [member.tasks]);

    const raw = Math.max(0, totalCapacityPct);
    const percent = Math.min(raw, 100);

    const color =
        percent >= 81 ? "bg-rose-500" : percent >= 51 ? "bg-amber-500" : "bg-emerald-500";

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
            className={`flex h-[720px] shrink-0 basis-[calc((100%-3rem)/4)] min-w-[280px] flex-col rounded-[24px] border border-slate-200 border-t-4 px-4 py-4 shadow-sm transition ${isDragOver ? "bg-sky-50 ring-2 ring-sky-300" : "bg-slate-50"
                } ${member.columnColor}`}
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="relative min-w-0 flex-1" ref={popoverRef}>
                    <button
                        type="button"
                        onClick={() => setIsScheduleOpen((prev) => !prev)}
                        className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-white/70"
                    >
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor}`}
                        >
                            {member.initials}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-bold text-slate-900">
                                    {member.member_name}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${roleBadge}`}>
                                    {role}
                                </span>
                                <TodayStatusBadge status={todayStatus} />
                            </div>
                        </div>
                    </button>

                    {isScheduleOpen ? (
                        <SchedulePopover schedule={memberSchedule} todayStatus={todayStatus} />
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={() => onDeleteMember(member.member_id)}
                    className="shrink-0 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-bold text-rose-600 transition hover:bg-rose-50"
                >
                    削除
                </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
                </div>
                <div className="w-[56px] shrink-0 text-right text-xs font-bold text-slate-700">
                    {raw}%
                </div>
            </div>

            <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>{member.capacity_label}</span>
                <span>{sortedTasks.length} 件</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {sortedTasks.length > 0 ? (
                    sortedTasks.map((task) => (
                        <TaskCard
                            key={task.task_id}
                            task={task}
                            currentMemberName={member.member_name}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            onComplete={onCompleteTask}
                            isDragging={draggingTaskId === task.task_id}
                            onDragStart={() => onDragStartTask(task.task_id, member.member_name)}
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
    );
}