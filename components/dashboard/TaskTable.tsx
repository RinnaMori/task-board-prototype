"use client";

import { useMemo, useState } from "react";
import { STATUS_OPTIONS, getDueTextClass, isOverdue, useDashboardStore } from "@/lib/dashboard-store";
import { AppShell } from "./AppShell";
import { PriorityBadge, StatusBadge } from "./StatusBadge";

export function TaskTable() {
    const { members, tasks } = useDashboardStore();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | (typeof STATUS_OPTIONS)[number]>("all");
    const [memberName, setMemberName] = useState("all");

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const keyword = search.trim();
            const hitKeyword =
                !keyword ||
                [task.task_id, task.task_name, task.project_name, task.manager, task.leader, task.assignee]
                    .join(" ")
                    .includes(keyword);

            const hitStatus = status === "all" || task.status === status;
            const hitMember = memberName === "all" || task.assignee === memberName;

            return hitKeyword && hitStatus && hitMember;
        });
    }, [memberName, search, status, tasks]);

    return (
        <AppShell
            title="タスク一覧ページ"
            description="要件の S-01 に合わせて、全タスクを表形式で確認できる一覧ページです。"
        >
            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-3">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="タスク名 / ID / 担当者で検索"
                            className="min-w-[280px] rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-slate-400"
                        />
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value as typeof status)}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-400"
                        >
                            <option value="all">全ステータス</option>
                            {STATUS_OPTIONS.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                        <select
                            value={memberName}
                            onChange={(event) => setMemberName(event.target.value)}
                            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-400"
                        >
                            <option value="all">全メンバー</option>
                            {members.map((member) => (
                                <option key={member.member_id} value={member.member_name}>
                                    {member.member_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        表示件数: {filteredTasks.length} / {tasks.length}
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="bg-slate-50 text-left text-slate-700">
                            <tr>
                                {[
                                    "タスクID",
                                    "タスク名",
                                    "プロジェクト",
                                    "優先度",
                                    "ステータス",
                                    "進捗",
                                    "期日",
                                    "Manager",
                                    "Leader",
                                    "担当者",
                                    "キャパ",
                                ].map((label) => (
                                    <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map((task) => (
                                <tr key={task.task_id} className="align-top odd:bg-white even:bg-slate-50/60">
                                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">{task.task_id}</td>
                                    <td className="border-b border-slate-100 px-4 py-3">
                                        <div className="font-bold text-slate-900">{task.task_name}</div>
                                        <div className="mt-1 text-xs text-slate-500">{task.description || "説明なし"}</div>
                                        {isOverdue(task) ? (
                                            <div className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                                期日超過
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">{task.project_name}</td>
                                    <td className="border-b border-slate-100 px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                                    <td className="border-b border-slate-100 px-4 py-3"><StatusBadge status={task.status} /></td>
                                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">{task.progress_pct}%</td>
                                    <td className={`border-b border-slate-100 px-4 py-3 font-semibold ${getDueTextClass(task)}`}>{task.due_date || "未設定"}</td>
                                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{task.manager}</td>
                                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{task.leader}</td>
                                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{task.assignee}</td>
                                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">{task.capacity_pct}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </AppShell>
    );
}