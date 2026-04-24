"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import {
    getDashboardVisibleTasks,
    inferRoleFromName,
    isOverdue,
    sortTasksForDashboard,
} from "@/lib/dashboard-store";
import { fetchSupabaseDashboardStore } from "@/lib/supabase/dashboard-reader";
import type { DashboardStore, Member, MemberRole, TaskStatus } from "@/types/dashboard";

type LoadState = "loading" | "ready" | "error";

function CapacityMeter({ total }: { total: number }) {
    const raw = Math.max(0, total);
    const percent = Math.min(raw, 100);

    const color =
        percent >= 81 ? "bg-rose-500" : percent >= 51 ? "bg-amber-500" : "bg-emerald-500";

    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
            </div>
            <div className="w-[56px] shrink-0 text-right text-xs font-bold text-slate-700">{raw}%</div>
        </div>
    );
}

export function SupabaseDashboardPreview() {
    const [state, setState] = useState<LoadState>("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [store, setStore] = useState<DashboardStore>({ members: [], projects: [] });
    const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
    const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");

    useEffect(() => {
        let active = true;

        const run = async () => {
            try {
                setState("loading");
                const nextStore = await fetchSupabaseDashboardStore();
                if (!active) return;
                setStore(nextStore);
                setState("ready");
            } catch (error) {
                if (!active) return;
                setState("error");
                setErrorMessage(error instanceof Error ? error.message : "不明なエラーが発生しました。");
            }
        };

        run();

        return () => {
            active = false;
        };
    }, []);

    const visibleMembers = useMemo(() => {
        const filteredByRole =
            roleFilter === "all"
                ? store.members
                : store.members.filter((member) => inferRoleFromName(member.member_name) === roleFilter);

        return filteredByRole.map((member) => ({
            ...member,
            tasks: sortTasksForDashboard(
                member.tasks.filter((task) => {
                    if (!getDashboardVisibleTasks([member]).some((visible) => visible.task_id === task.task_id)) {
                        return false;
                    }
                    if (filterStatus === "all") return true;
                    return task.status === filterStatus;
                }),
            ),
        }));
    }, [filterStatus, roleFilter, store.members]);

    const overview = useMemo(() => {
        const allTasks = store.members.flatMap((member) => member.tasks);
        const dashboardTasks = getDashboardVisibleTasks(store.members);

        return {
            totalTasks: allTasks.length,
            visibleDashboardTasks: dashboardTasks.length,
            overdueCount: dashboardTasks.filter((task) => isOverdue(task)).length,
            dueTodayCount: dashboardTasks.filter(
                (task) =>
                    task.status !== "完了" &&
                    task.due_date &&
                    task.due_date.slice(0, 10) === new Date().toISOString().slice(0, 10),
            ).length,
        };
    }, [store.members]);

    return (
        <AppShell
            title="Supabase ダッシュボード確認ページ"
            description="既存の localStorage 版は触らず、Supabase から読み取ったデータだけを別ページで確認します。"
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/dashboard"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        既存ダッシュボードへ戻る
                    </Link>
                </div>
            }
        >
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">全タスク数</p>
                    <p className="mt-2 text-4xl font-extrabold text-slate-900">{overview.totalTasks}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">ダッシュボード表示中</p>
                    <p className="mt-2 text-4xl font-extrabold text-slate-900">
                        {overview.visibleDashboardTasks}
                    </p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">期日が今日</p>
                    <p className="mt-2 text-4xl font-extrabold text-amber-600">{overview.dueTodayCount}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">期日超過</p>
                    <p className="mt-2 text-4xl font-extrabold text-red-600">{overview.overdueCount}</p>
                </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <label className="mr-2 text-sm font-semibold text-slate-600">ステータス</label>
                        <select
                            className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
                            value={filterStatus}
                            onChange={(event) => setFilterStatus(event.target.value as TaskStatus | "all")}
                        >
                            <option value="all">すべて</option>
                            <option value="未着手">未着手</option>
                            <option value="進行中">進行中</option>
                            <option value="完了">完了</option>
                            <option value="保留">保留</option>
                        </select>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <label className="mr-2 text-sm font-semibold text-slate-600">役職</label>
                        <select
                            className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
                            value={roleFilter}
                            onChange={(event) => setRoleFilter(event.target.value as MemberRole | "all")}
                        >
                            <option value="all">すべて</option>
                            <option value="マネージャー">マネージャー</option>
                            <option value="リーダー">リーダー</option>
                            <option value="正社員">正社員</option>
                            <option value="業務委託">業務委託</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        再読み込み
                    </button>
                </div>

                {state === "loading" ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm font-medium text-slate-500">
                        Supabase から読み込み中です...
                    </div>
                ) : null}

                {state === "error" ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-sm font-medium text-rose-700">
                        読み込みに失敗しました: {errorMessage}
                    </div>
                ) : null}

                {state === "ready" ? (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {visibleMembers.map((member) => {
                            const totalCapacity = member.tasks
                                .filter((task) => task.status !== "完了")
                                .reduce((sum, task) => sum + (task.capacity_pct || 0), 0);

                            return (
                                <section
                                    key={member.member_id}
                                    className={`flex h-[720px] shrink-0 basis-[calc((100%-3rem)/4)] min-w-[280px] flex-col rounded-[24px] border border-slate-200 border-t-4 bg-slate-50 px-4 py-4 shadow-sm ${member.columnColor}`}
                                >
                                    <div className="mb-3">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-base font-extrabold text-slate-900">
                                                    {member.member_name}
                                                </p>
                                                <p className="text-xs font-medium text-slate-500">
                                                    {inferRoleFromName(member.member_name)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-semibold text-slate-500">当日件数</p>
                                                <p className="text-2xl font-extrabold leading-none text-slate-900">
                                                    {member.due_today_count}
                                                </p>
                                            </div>
                                        </div>

                                        <CapacityMeter total={totalCapacity} />

                                        <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                            <span>{member.capacity_label}</span>
                                            <span>表示中 {member.tasks.length} 件</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                                        {member.tasks.length > 0 ? (
                                            member.tasks.map((task) => (
                                                <div
                                                    key={task.task_id}
                                                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                                                >
                                                    <div className="mb-2 flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-slate-900">
                                                                {task.task_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">{task.project_name}</p>
                                                        </div>
                                                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                            {task.status}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                                                        <div>優先度: {task.priority}</div>
                                                        <div>キャパ: {task.capacity_pct}%</div>
                                                        <div>担当: {task.assignee}</div>
                                                        <div>期日: {task.due_date || "未設定"}</div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-5 text-center text-sm font-medium text-slate-400">
                                                表示対象タスクなし
                                            </div>
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        </AppShell>
    );
}