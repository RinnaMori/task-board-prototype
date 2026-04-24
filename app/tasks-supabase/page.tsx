"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/dashboard/AppShell";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/StatusBadge";
import {
    formatDateTimeLabel,
    getCompletedTasks,
    getDueLabel,
    getDueTextClass,
    getActiveTasks,
} from "@/lib/dashboard-store";
import { fetchSupabaseDashboardStore } from "@/lib/supabase/dashboard-reader";
import type { DashboardStore } from "@/types/dashboard";

type LoadState = "loading" | "ready" | "error";

export default function TasksSupabasePage() {
    const [state, setState] = useState<LoadState>("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [store, setStore] = useState<DashboardStore>({ members: [], projects: [] });

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

    const activeTasks = useMemo(() => getActiveTasks(store.members), [store.members]);
    const completedTasks = useMemo(() => getCompletedTasks(store.members), [store.members]);

    return (
        <AppShell
            title="Supabase タスク一覧確認ページ"
            description="既存の localStorage 版は触らず、Supabase から読んだタスク一覧だけを別ページで確認します。"
            actions={
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/tasks"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        既存タスク一覧へ戻る
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        再読み込み
                    </button>
                </div>
            }
        >
            {state === "loading" ? (
                <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">Supabase から読み込み中です...</p>
                </section>
            ) : null}

            {state === "error" ? (
                <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-8 shadow-sm">
                    <p className="text-sm font-medium text-rose-700">読み込みに失敗しました: {errorMessage}</p>
                </section>
            ) : null}

            {state === "ready" ? (
                <>
                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-xl font-extrabold text-slate-900">現在のタスク</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Supabase から読み込んだ未完了タスク一覧です。
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-left text-slate-700">
                                    <tr>
                                        {["ID", "タスク名", "優先度", "状態", "期日", "Manager", "Leader", "担当者"].map(
                                            (label) => (
                                                <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                                    {label}
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTasks.map((task) => (
                                        <tr key={task.task_id} className="odd:bg-white even:bg-slate-50/60">
                                            <td className="border-b border-slate-100 px-4 py-3">{task.task_id}</td>
                                            <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                                                {task.task_name}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                <PriorityBadge priority={task.priority} />
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                <StatusBadge status={task.status} />
                                            </td>
                                            <td className={`border-b border-slate-100 px-4 py-3 ${getDueTextClass(task)}`}>
                                                {getDueLabel(task.due_date)}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">{task.manager || "未設定"}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{task.leader || "未設定"}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{task.assignee || "未設定"}</td>
                                        </tr>
                                    ))}
                                    {activeTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                                                現在のタスクはありません
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                            <h2 className="text-xl font-extrabold text-slate-900">完了済みエリア</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Supabase から読み込んだ完了済みタスク一覧です。
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-left text-slate-700">
                                    <tr>
                                        {["ID", "タスク名", "完了日時", "Manager", "Leader", "担当者"].map((label) => (
                                            <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedTasks.map((task) => (
                                        <tr key={task.task_id} className="odd:bg-white even:bg-slate-50/60">
                                            <td className="border-b border-slate-100 px-4 py-3">{task.task_id}</td>
                                            <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-500 line-through">
                                                {task.task_name}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {formatDateTimeLabel(task.completed_at)}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">{task.manager || "未設定"}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{task.leader || "未設定"}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{task.assignee || "未設定"}</td>
                                        </tr>
                                    ))}
                                    {completedTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                                                完了済みタスクはありません
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            ) : null}
        </AppShell>
    );
}