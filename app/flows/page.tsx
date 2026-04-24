"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
    buildFlowLogRows,
    buildFlowRows,
    formatDateTimeLabel,
    getCompletedTasks,
} from "@/lib/dashboard-store";
import { fetchSupabaseDashboardStore } from "@/lib/supabase/dashboard-reader";
import type { DashboardStore } from "@/types/dashboard";

type LoadState = "loading" | "ready" | "error";

export default function FlowsPage() {
    const [state, setState] = useState<LoadState>("loading");
    const [errorMessage, setErrorMessage] = useState("");
    const [store, setStore] = useState<DashboardStore>({ members: [], projects: [] });
    const [search, setSearch] = useState("");

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

    const members = store.members;

    const completedRows = useMemo(() => buildFlowRows(getCompletedTasks(members)), [members]);

    const logRows = useMemo(() => {
        return buildFlowLogRows(members.flatMap((member) => member.tasks));
    }, [members]);

    const filteredLogRows = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return logRows;

        return logRows.filter((row) => {
            return (
                row.task_id.toLowerCase().includes(keyword) ||
                row.task_name.toLowerCase().includes(keyword)
            );
        });
    }, [logRows, search]);

    return (
        <AppShell
            title="差配フロー"
            description="ドラッグ操作ごとの履歴ログと、完了済みフローを確認できます。"
            actions={
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                    再読み込み
                </button>
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
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900">差配履歴ログ</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        1回のドラッグ操作を1件として記録し、最新順で表示しています。
                                    </p>
                                </div>

                                <label className="block w-full max-w-sm">
                                    <span className="mb-2 block text-sm font-bold text-slate-700">
                                        タスク名 / タスクID 検索
                                    </span>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="例: T-001 / Webサイト更新"
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-left text-slate-700">
                                    <tr>
                                        {["日時", "タスクID", "タスク名", "From", "To", "区分", "現在状態"].map((label) => (
                                            <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogRows.map((row) => (
                                        <tr key={row.log_id} className="odd:bg-white even:bg-slate-50/60">
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {formatDateTimeLabel(row.changed_at)}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.task_id}</td>
                                            <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                                                {row.task_name}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.from}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.to}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.role}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                <StatusBadge status={row.status} />
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                                                該当する履歴がありません
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
                                完了済みフローは時間に関係なくここへ残ります。
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                                <thead className="bg-slate-50 text-left text-slate-700">
                                    <tr>
                                        {["ID", "タスク名", "Manager", "Leader", "担当者", "A→B→C", "完了日時"].map((label) => (
                                            <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {completedRows.map((row) => (
                                        <tr key={row.task_id} className="odd:bg-white even:bg-slate-50/60">
                                            <td className="border-b border-slate-100 px-4 py-3">{row.task_id}</td>
                                            <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-500 line-through">
                                                {row.task_name}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.manager}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.leader}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">{row.assignee}</td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {row.manager} → {row.leader} → {row.assignee}
                                            </td>
                                            <td className="border-b border-slate-100 px-4 py-3">
                                                {formatDateTimeLabel(row.completed_at)}
                                            </td>
                                        </tr>
                                    ))}
                                    {completedRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">
                                                完了済みフローはありません
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