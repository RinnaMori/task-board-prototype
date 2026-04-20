"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { buildFlowRows, formatDateTimeLabel, getCompletedTasks, getDueLabel, getActiveTasks, useDashboardStore } from "@/lib/dashboard-store";

export default function FlowsPage() {
    const { members } = useDashboardStore();

    const activeRows = buildFlowRows(getActiveTasks(members));
    const completedRows = buildFlowRows(getCompletedTasks(members));

    return (
        <AppShell
            title="差配フロー一覧"
            description="A→B→C の流れを1行で確認できます。完了済みは下部に永続表示されます。"
        >
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-xl font-extrabold text-slate-900">現在の差配フロー</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-slate-50 text-left text-slate-700">
                            <tr>
                                {["ID", "タスク名", "Manager", "Leader", "担当者", "現在の差配", "状態", "期日"].map((label) => (
                                    <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeRows.map((row) => (
                                <tr key={row.task_id} className="odd:bg-white even:bg-slate-50/60">
                                    <td className="border-b border-slate-100 px-4 py-3">{row.task_id}</td>
                                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">{row.task_name}</td>
                                    <td className="border-b border-slate-100 px-4 py-3">{row.manager}</td>
                                    <td className="border-b border-slate-100 px-4 py-3">{row.leader}</td>
                                    <td className="border-b border-slate-100 px-4 py-3">{row.assignee}</td>
                                    <td className="border-b border-slate-100 px-4 py-3">
                                        {row.current_from} → {row.current_to}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3">
                                        <StatusBadge status={row.status} />
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3">{getDueLabel(row.due_date)}</td>
                                </tr>
                            ))}
                            {activeRows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-400">
                                        現在の差配フローはありません
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
                    <p className="mt-1 text-sm text-slate-500">完了済みフローは時間に関係なくここへ残ります。</p>
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
        </AppShell>
    );
}