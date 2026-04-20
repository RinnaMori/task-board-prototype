"use client";

import { useMemo, useState } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";
import { AppShell } from "./AppShell";
import { StatusBadge } from "./StatusBadge";

type BadgeStatus = React.ComponentProps<typeof StatusBadge>["status"];

type AssignmentHistoryItem = {
  manager?: string;
  leader?: string;
  assignee?: string;
  from?: string;
  to?: string;
  delegated_at?: string;
  assigned_at?: string;
  created_at?: string;
  latest_flow?: string;
};

type TaskLike = {
  task_id: string;
  task_name?: string;
  manager?: string;
  leader?: string;
  assignee?: string;
  delegated_at?: string;
  assigned_at?: string;
  created_at?: string;
  latest_flow?: string;
  status?: string;
  assignment_history?: AssignmentHistoryItem[];
};

type FlowRow = {
  task_id: string;
  task_name: string;
  manager: string;
  leader: string;
  assignee: string;
  latest_flow: string;
  delegated_at: string;
  status: BadgeStatus;
};

function pickLatestHistory(history?: AssignmentHistoryItem[]) {
  if (!history || history.length === 0) return undefined;
  return history[history.length - 1];
}

function toDisplay(value?: string) {
  return value && value.trim() ? value : "-";
}

function normalizeStatus(status?: string): BadgeStatus {
  const value = (status ?? "").trim().toLowerCase();

  switch (value) {
    case "todo":
    case "to_do":
    case "not_started":
    case "未着手":
      return "todo" as BadgeStatus;
    case "in_progress":
    case "inprogress":
    case "doing":
    case "進行中":
      return "in_progress" as BadgeStatus;
    case "done":
    case "completed":
    case "完了":
      return "done" as BadgeStatus;
    case "blocked":
    case "保留":
      return "blocked" as BadgeStatus;
    default:
      return "todo" as BadgeStatus;
  }
}

export function FlowTable() {
  const { tasks } = useDashboardStore() as { tasks: TaskLike[] };
  const [search, setSearch] = useState("");

  const flowRows = useMemo<FlowRow[]>(() => {
    return (tasks ?? []).map((task) => {
      const latestHistory = pickLatestHistory(task.assignment_history);

      const manager = toDisplay(latestHistory?.manager ?? task.manager);
      const leader = toDisplay(latestHistory?.leader ?? task.leader);
      const assignee = toDisplay(latestHistory?.assignee ?? task.assignee);

      const latestFlow = toDisplay(
        latestHistory?.latest_flow ??
        (manager !== "-" || leader !== "-" || assignee !== "-"
          ? `${manager} → ${leader} → ${assignee}`
          : undefined)
      );

      const delegatedAt = toDisplay(
        latestHistory?.delegated_at ??
        latestHistory?.assigned_at ??
        latestHistory?.created_at ??
        task.delegated_at ??
        task.assigned_at ??
        task.created_at
      );

      return {
        task_id: task.task_id,
        task_name: toDisplay(task.task_name),
        manager,
        leader,
        assignee,
        latest_flow: latestFlow,
        delegated_at: delegatedAt,
        status: normalizeStatus(task.status),
      };
    });
  }, [tasks]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return flowRows.filter((row) => {
      if (!keyword) return true;

      return [
        row.task_id,
        row.task_name,
        row.manager,
        row.leader,
        row.assignee,
        row.latest_flow,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [flowRows, search]);

  return (
    <AppShell
      title="差配フロー一覧ページ"
      description="要件の S-03 / F-05 に合わせて、Manager → Leader → 担当者の差配フローを1行で確認できます。"
    >
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="タスクID / タスク名 / 担当者で検索"
            className="min-w-[280px] rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-slate-400"
          />
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            表示件数: {filteredRows.length} / {flowRows.length}
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
                  "Manager（起点）",
                  "Leader（中継）",
                  "担当者（実行）",
                  "最新フロー",
                  "差配日時",
                  "ステータス",
                  "履歴件数",
                ].map((label) => (
                  <th
                    key={label}
                    className="border-b border-slate-200 px-4 py-3 font-bold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const task = (tasks ?? []).find(
                  (item) => item.task_id === row.task_id
                );

                return (
                  <tr
                    key={row.task_id}
                    className="align-top odd:bg-white even:bg-slate-50/60"
                  >
                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                      {row.task_id}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                      {row.task_name}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {row.manager}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {row.leader}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {row.assignee}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-slate-700">
                      {row.latest_flow}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
                      {row.delegated_at}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-700">
                      {task?.assignment_history?.length ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}