"use client";

import { ROLE_OPTIONS, STATUS_OPTIONS } from "@/lib/dashboard-store";
import type { MemberRole, TaskStatus } from "@/types/dashboard";

type DashboardHeaderProps = {
    filterStatus: TaskStatus | "all";
    onChangeStatus: (value: TaskStatus | "all") => void;
    roleFilter: MemberRole | "all";
    onChangeRole: (value: MemberRole | "all") => void;
    onOpenTaskModal: () => void;
    onOpenMemberModal: () => void;
    onOpenProjectModal: () => void;
    onReset: () => void;
};

export function DashboardHeader({
    filterStatus,
    onChangeStatus,
    roleFilter,
    onChangeRole,
    onOpenTaskModal,
    onOpenMemberModal,
    onOpenProjectModal,
    onReset,
}: DashboardHeaderProps) {
    return (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">ステータス絞り込み</span>
                        <select
                            value={filterStatus}
                            onChange={(event) => onChangeStatus(event.target.value as TaskStatus | "all")}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                        >
                            <option value="all">すべて</option>
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">役職絞り込み</span>
                        <select
                            value={roleFilter}
                            onChange={(event) => onChangeRole(event.target.value as MemberRole | "all")}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                        >
                            <option value="all">すべて</option>
                            {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onOpenTaskModal}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                        タスク追加
                    </button>
                    <button
                        type="button"
                        onClick={onOpenMemberModal}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        メンバー追加
                    </button>
                    <button
                        type="button"
                        onClick={onOpenProjectModal}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        プロジェクト追加
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                        初期化
                    </button>
                </div>
            </div>
        </section>
    );
}