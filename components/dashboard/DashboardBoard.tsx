"use client";

import { useMemo, useState } from "react";
import { defaultStore } from "@/data/mock-data";
import {
  createInitialAssignmentHistory,
  formatNow,
  getInitials,
  getMemberCapacity,
  getProjectColor,
  isOverdue,
  useDashboardStore,
} from "@/lib/dashboard-store";
import type {
  Member,
  NewTaskInput,
  Project,
  Task,
  TaskColor,
  TaskStatus,
  UpdateTaskInput,
} from "@/types/dashboard";

import { AppShell } from "./AppShell";
import { DashboardHeader } from "./DashboardHeader";
import { MemberAddModal } from "./MemberAddModal";
import { MemberColumn } from "./MemberColumn";
import { ProjectAddModal } from "./ProjectAddModal";
import { TaskAddModal } from "./TaskAddModal";
import { TaskEditModal } from "./TaskEditModal";
import { StatusBadge } from "./StatusBadge";

function getNextTaskId(members: Member[]) {
  const maxNumber = members
    .flatMap((member) => member.tasks)
    .map((task) => Number(task.task_id.replace(/[^0-9]/g, "")) || 0)
    .reduce((max, current) => Math.max(max, current), 0);

  return `T-${String(maxNumber + 1).padStart(3, "0")}`;
}

function moveTaskBetweenMembers(
  members: Member[],
  taskId: string,
  targetMemberName: string,
  partialUpdate?: Partial<Task>,
) {
  let sourceTask: Task | null = null;
  let fromMemberName = "";

  const removed = members.map((member) => {
    const found = member.tasks.find((task) => task.task_id === taskId);
    if (!found) return member;

    sourceTask = found;
    fromMemberName = member.member_name;

    return {
      ...member,
      tasks: member.tasks.filter((task) => task.task_id !== taskId),
    };
  });

  if (!sourceTask) return members;
  const task: Task = sourceTask as Task;

  return removed.map((member) => {
    if (member.member_name !== targetMemberName) return member;

    const shouldAppendHistory = fromMemberName && fromMemberName !== targetMemberName;
    const nextHistory = shouldAppendHistory
      ? [
        ...task.assignment_history,
        {
          from: fromMemberName,
          to: targetMemberName,
          role: "担当変更" as const,
          changed_at: formatNow(),
        },
      ]
      : task.assignment_history;

    const movedTask: Task = {
      ...task,
      ...partialUpdate,
      assignee: targetMemberName,
      assigned_to: targetMemberName,
      flow_from: shouldAppendHistory ? fromMemberName : task.flow_from,
      flow_to: targetMemberName,
      assignment_history: nextHistory,
    };

    return {
      ...member,
      tasks: [...member.tasks, movedTask],
    };
  });
}

export function DashboardBoard() {
  const { members, rawMembers, projects, tasks, statusSummary, setMembers, setProjects, resetStore } =
    useDashboardStore();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const visibleMembers = useMemo(() => {
    return members.map((member) => ({
      ...member,
      tasks: member.tasks.filter((task) => {
        const keyword = search.trim();
        const hitKeyword =
          !keyword ||
          [task.task_id, task.task_name, task.project_name, task.assignee, task.manager, task.leader]
            .join(" ")
            .includes(keyword);
        const hitStatus = filterStatus === "all" || task.status === filterStatus;
        return hitKeyword && hitStatus;
      }),
    }));
  }, [filterStatus, members, search]);

  const overview = useMemo(() => {
    const overdueCount = tasks.filter((task) => isOverdue(task)).length;
    const inProgressCapacity = members.reduce((sum, member) => sum + getMemberCapacity(member), 0);
    return {
      totalTasks: tasks.length,
      overdueCount,
      inProgressCount: tasks.filter((task) => task.status === "進行中").length,
      inProgressCapacity,
    };
  }, [members, tasks]);

  const handleDeleteTask = (taskId: string) => {
    setMembers(rawMembers.map((member) => ({ ...member, tasks: member.tasks.filter((task) => task.task_id !== taskId) })));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleAddTask = (newTask: NewTaskInput) => {
    const projectColor = getProjectColor(newTask.project_name, projects);
    const targetAssignee = rawMembers.find((member) => member.member_name === newTask.assignee)?.member_name;
    if (!targetAssignee) return;

    const nextTask: Task = {
      task_id: getNextTaskId(rawMembers),
      task_name: newTask.task_name,
      project_name: newTask.project_name,
      priority: newTask.priority,
      status: "未着手",
      progress_pct: 0,
      manager: newTask.manager,
      leader: newTask.leader,
      assignee: newTask.assignee,
      capacity_pct: newTask.capacity_pct,
      assigned_to: newTask.assignee,
      description: newTask.description,
      flow_from: newTask.leader || newTask.manager,
      flow_to: newTask.assignee,
      accentColor: projectColor.accentColor,
      color: projectColor.color,
      due_date: newTask.due_date,
      memo: newTask.memo,
      assignment_history: createInitialAssignmentHistory(newTask),
    };

    setMembers(
      rawMembers.map((member) => {
        if (member.member_name !== targetAssignee) return member;
        return {
          ...member,
          tasks: [...member.tasks, nextTask],
        };
      }),
    );
  };

  const handleUpdateTask = (updatedTask: UpdateTaskInput) => {
    const projectColor = getProjectColor(updatedTask.project_name, projects);
    const currentTask = rawMembers.flatMap((member) => member.tasks).find((task) => task.task_id === updatedTask.task_id);
    if (!currentTask) return;

    const nextTask: Partial<Task> = {
      task_name: updatedTask.task_name,
      project_name: updatedTask.project_name,
      priority: updatedTask.priority,
      description: updatedTask.description,
      due_date: updatedTask.due_date,
      memo: updatedTask.memo,
      status: updatedTask.status,
      progress_pct: updatedTask.progress_pct,
      manager: updatedTask.manager,
      leader: updatedTask.leader,
      capacity_pct: updatedTask.capacity_pct,
      accentColor: projectColor.accentColor,
      color: projectColor.color,
    };

    const assigneeChanged = currentTask.assignee !== updatedTask.assignee;

    if (assigneeChanged) {
      setMembers(moveTaskBetweenMembers(rawMembers, updatedTask.task_id, updatedTask.assignee, nextTask));
    } else {
      setMembers(
        rawMembers.map((member) => ({
          ...member,
          tasks: member.tasks.map((task) =>
            task.task_id === updatedTask.task_id
              ? {
                ...task,
                ...nextTask,
                assignee: updatedTask.assignee,
                assigned_to: updatedTask.assignee,
              }
              : task,
          ),
        })),
      );
    }

    setEditingTask(null);
  };

  const handleAddMember = (input: { member_name: string; columnColor: string }) => {
    setMembers([
      ...rawMembers,
      {
        member_id: crypto.randomUUID(),
        member_name: input.member_name,
        initials: getInitials(input.member_name),
        capacity_pct: 0,
        capacity_label: "0 / 100",
        columnColor: input.columnColor,
        tasks: [],
      },
    ]);
  };

  const handleAddProject = (input: { project_name: string; color: TaskColor; accentColor: string }) => {
    setProjects([
      ...projects,
      {
        project_id: crypto.randomUUID(),
        project_name: input.project_name,
        color: input.color,
        accentColor: input.accentColor,
      },
    ]);
  };

  const handleDropTaskToMember = (targetMemberName: string) => {
    if (!draggingTaskId) return;
    setMembers(moveTaskBetweenMembers(rawMembers, draggingTaskId, targetMemberName));
    setDraggingTaskId(null);
  };

  return (
    <AppShell
      title="タスク・キャパシティ管理ダッシュボード"
      description="メンバー別ボード、ステータス別集計、キャパ集計、差配の流れをまとめて確認できます。"
      actions={
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          要件対応: ステータス別表示 / 負荷合計 / 差配フロー / タスク一覧
        </div>
      }
    >
      <DashboardHeader
        search={search}
        onChangeSearch={setSearch}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        onOpenTaskModal={() => setIsTaskModalOpen(true)}
        onOpenMemberModal={() => setIsMemberModalOpen(true)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onReset={resetStore}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">総タスク数</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-900">{overview.totalTasks}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">進行中タスク</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-900">{overview.inProgressCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">進行中キャパ合計</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-900">{overview.inProgressCapacity}%</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">期日超過タスク</p>
          <p className="mt-2 text-4xl font-extrabold text-red-600">{overview.overdueCount}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr,1fr]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-extrabold text-slate-900">件数集計表</h2>
            <p className="mt-1 text-sm text-slate-500">メンバーごとの「未着手 / 進行中 / 完了 / 保留」を自動集計</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  {["担当者", "未着手", "進行中", "完了", "保留", "合計"].map((label) => (
                    <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statusSummary.map((row) => (
                  <tr key={row.member_name} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">{row.member_name}</td>
                    <td className="border-b border-slate-100 px-4 py-3">{row.未着手}</td>
                    <td className="border-b border-slate-100 px-4 py-3">{row.進行中}</td>
                    <td className="border-b border-slate-100 px-4 py-3">{row.完了}</td>
                    <td className="border-b border-slate-100 px-4 py-3">{row.保留}</td>
                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">{row.合計}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-extrabold text-slate-900">キャパシティ集計表</h2>
            <p className="mt-1 text-sm text-slate-500">「進行中」タスクのみを対象に負荷を合計</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  {["担当者", "合計"].map((label) => (
                    <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.member_id} className="odd:bg-white even:bg-slate-50/60">
                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">{member.member_name}</td>
                    <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">{member.capacity_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">メンバー別タスクボード</h2>
            <p className="mt-1 text-sm text-slate-500">ドラッグ&ドロップで担当変更できます。ステータスで絞り込んだ結果をそのまま表示します。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              表示中ステータス: {filterStatus === "all" ? "すべて" : filterStatus}
            </div>
            <StatusBadge status={filterStatus === "all" ? "未着手" : filterStatus} />
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {visibleMembers.map((member) => (
            <MemberColumn
              key={member.member_id}
              member={member}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onDropTask={handleDropTaskToMember}
              draggingTaskId={draggingTaskId}
              onDragStartTask={setDraggingTaskId}
              onDragEndTask={() => setDraggingTaskId(null)}
            />
          ))}
        </div>
      </section>

      <TaskAddModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        members={members}
        projects={projects}
        onSubmit={handleAddTask}
      />

      <TaskEditModal
        isOpen={Boolean(editingTask)}
        task={editingTask}
        members={members}
        projects={projects}
        onClose={() => setEditingTask(null)}
        onSubmit={handleUpdateTask}
      />

      <MemberAddModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSubmit={handleAddMember}
      />

      <ProjectAddModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleAddProject}
      />
    </AppShell>
  );
}