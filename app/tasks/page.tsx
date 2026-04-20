"use client";

import { AppShell } from "@/components/dashboard/AppShell";
import { PriorityBadge, StatusBadge } from "@/components/dashboard/StatusBadge";
import {
    formatDateTimeLabel,
    getCompletedTasks,
    getDueLabel,
    getDueTextClass,
    getActiveTasks,
    useDashboardStore,
} from "@/lib/dashboard-store";

export default function TasksPage() {
    const { members } = useDashboardStore();
    const activeTasks = getActiveTasks(members);
    const completedTasks = getCompletedTasks(members);

    return (
        <AppShell
            title="タスク一覧"
            description="完了済みタスクは下部の完了済みエリアに永続表示されます。"
        >
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-xl font-extrabold text-slate-900">現在のタスク</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-slate-50 text-left text-slate-700">
                            <tr>
                                {["ID", "タスク名", "優先度", "状態", "期日", "Manager", "Leader", "担当者"].map((label) => (
                                    <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                        {label}
                                    </th>
                                ))}
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
                    <p className="mt-1 text-sm text-slate-500">完了済みは時間に関係なくここへ残ります。</p>
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
                                    <td className="border-b border-slate-100 px-4 py-3">{formatDateTimeLabel(task.completed_at)}</td>
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
        </AppShell>
    );
}