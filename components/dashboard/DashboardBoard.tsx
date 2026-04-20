"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildAssignmentMatrix,
  createInitialAssignmentHistory,
  formatNow,
  getCompletedTasks,
  getInitials,
  getProjectColor,
  getRoleOrder,
  getDashboardVisibleTasks,
  inferRoleFromName,
  isOverdue,
  useDashboardStore,
} from "@/lib/dashboard-store";
import {
  createEmptyMemberSchedule,
  loadScheduleStore,
  saveScheduleStore,
} from "@/lib/schedule-utils";
import type { Member, MemberRole, NewTaskInput, Task, TaskColor, TaskStatus, UpdateTaskInput } from "@/types/dashboard";

import { AppShell } from "./AppShell";
import { DashboardHeader } from "./DashboardHeader";
import { MemberAddModal } from "./MemberAddModal";
import { MemberColumn } from "./MemberColumn";
import { ProjectAddModal } from "./ProjectAddModal";
import { TaskAddModal } from "./TaskAddModal";
import { TaskEditModal } from "./TaskEditModal";

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
      flow_from: shouldAppendHistory ? fromMemberName : partialUpdate?.flow_from ?? task.flow_from,
      flow_to: partialUpdate?.flow_to ?? targetMemberName,
      assignment_history: nextHistory,
    };

    return {
      ...member,
      tasks: [...member.tasks, movedTask],
    };
  });
}

function getFallbackMemberName(
  members: Member[],
  input: Pick<NewTaskInput, "assignee" | "leader" | "manager">,
) {
  return (
    input.assignee ||
    input.leader ||
    input.manager ||
    members.find((member) => inferRoleFromName(member.member_name) === "マネージャー")?.member_name ||
    members[0]?.member_name ||
    ""
  );
}

function insertMemberByRoleOrder(
  members: Member[],
  newMember: Member,
  newMemberRole: MemberRole,
) {
  const targetRoleOrder = getRoleOrder(newMemberRole);
  let insertIndex = members.length;

  for (let i = 0; i < members.length; i += 1) {
    const currentRoleOrder = getRoleOrder(inferRoleFromName(members[i].member_name));
    if (currentRoleOrder > targetRoleOrder) {
      insertIndex = i;
      break;
    }
  }

  return [...members.slice(0, insertIndex), newMember, ...members.slice(insertIndex)];
}

export function DashboardBoard() {
  const {
    members,
    rawMembers,
    projects,
    tasks,
    dashboardTasks,
    statusSummary,
    setMembers,
    setProjects,
    resetStore,
  } = useDashboardStore();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const visibleMembers = useMemo(() => {
    const filteredByRole =
      roleFilter === "all"
        ? members
        : members.filter((member) => inferRoleFromName(member.member_name) === roleFilter);

    return filteredByRole.map((member) => ({
      ...member,
      tasks: member.tasks.filter((task) => {
        if (!getDashboardVisibleTasks([member]).some((visible) => visible.task_id === task.task_id)) {
          return false;
        }
        if (filterStatus === "all") return true;
        return task.status === filterStatus;
      }),
    }));
  }, [filterStatus, members, roleFilter]);

  const overview = useMemo(() => {
    const overdueCount = dashboardTasks.filter((task) => isOverdue(task)).length;
    const dueTodayCount = dashboardTasks.filter(
      (task) => task.status !== "完了" && task.due_date && task.due_date.slice(0, 10) === new Date().toISOString().slice(0, 10),
    ).length;

    return {
      totalTasks: tasks.length,
      visibleDashboardTasks: dashboardTasks.length,
      overdueCount,
      dueTodayCount,
      completedCount: getCompletedTasks(members).length,
    };
  }, [dashboardTasks, members, tasks.length]);

  const sortedStatusSummary = useMemo(() => {
    return [...statusSummary]
      .filter((row) => roleFilter === "all" || inferRoleFromName(row.member_name) === roleFilter)
      .sort((a, b) => {
        const roleDiff =
          getRoleOrder(inferRoleFromName(a.member_name)) -
          getRoleOrder(inferRoleFromName(b.member_name));
        return roleDiff || a.member_name.localeCompare(b.member_name, "ja");
      });
  }, [roleFilter, statusSummary]);

  const assignmentMatrix = useMemo(() => buildAssignmentMatrix(tasks), [tasks]);

  const handleDeleteTask = (taskId: string) => {
    setMembers(
      rawMembers.map((member) => ({
        ...member,
        tasks: member.tasks.filter((task) => task.task_id !== taskId),
      })),
    );
  };

  const handleCompleteTask = (taskId: string) => {
    setMembers(
      rawMembers.map((member) => ({
        ...member,
        tasks: member.tasks.map((task) =>
          task.task_id === taskId
            ? {
              ...task,
              status: "完了",
              progress_pct: 100,
              completed_at: formatNow(),
            }
            : task,
        ),
      })),
    );
  };

  const handleDeleteMember = (memberId: string) => {
    const targetMember = rawMembers.find((member) => member.member_id === memberId);
    if (!targetMember) return;

    const hasTasks = targetMember.tasks.length > 0;
    const confirmed = window.confirm(
      hasTasks
        ? `${targetMember.member_name} を削除します。\nこのメンバーのタスクも一緒に削除されます。`
        : `${targetMember.member_name} を削除します。よろしいですか？`,
    );

    if (!confirmed) return;

    setMembers(rawMembers.filter((member) => member.member_id !== memberId));

    const scheduleStore = loadScheduleStore();
    saveScheduleStore({
      members: scheduleStore.members.filter((member) => member.member_name !== targetMember.member_name),
    });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleAddTask = (newTask: NewTaskInput) => {
    const projectColor = getProjectColor(newTask.project_name, projects);
    const targetMemberName = getFallbackMemberName(rawMembers, newTask);
    if (!targetMemberName) return;

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
      completed_at: null,
      assignment_history: createInitialAssignmentHistory(newTask),
    };

    setMembers(
      rawMembers.map((member) => {
        if (member.member_name !== targetMemberName) return member;
        return {
          ...member,
          tasks: [...member.tasks, nextTask],
        };
      }),
    );
  };

  const handleUpdateTask = (updatedTask: UpdateTaskInput) => {
    const projectColor = getProjectColor(updatedTask.project_name, projects);
    const currentTask = rawMembers
      .flatMap((member) => member.tasks)
      .find((task) => task.task_id === updatedTask.task_id);

    if (!currentTask) return;

    const targetMemberName = getFallbackMemberName(rawMembers, updatedTask);
    if (!targetMemberName) return;

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
      assignee: updatedTask.assignee,
      assigned_to: updatedTask.assignee,
      capacity_pct: updatedTask.capacity_pct,
      flow_from: updatedTask.leader || updatedTask.manager,
      flow_to: updatedTask.assignee,
      accentColor: projectColor.accentColor,
      color: projectColor.color,
      completed_at:
        updatedTask.status === "完了"
          ? currentTask.completed_at ?? formatNow()
          : null,
    };

    const currentOwnerName = rawMembers.find((member) =>
      member.tasks.some((task) => task.task_id === updatedTask.task_id),
    )?.member_name;

    const ownerChanged = currentOwnerName !== targetMemberName;

    if (ownerChanged) {
      setMembers(moveTaskBetweenMembers(rawMembers, updatedTask.task_id, targetMemberName, nextTask));
    } else {
      setMembers(
        rawMembers.map((member) => ({
          ...member,
          tasks: member.tasks.map((task) =>
            task.task_id === updatedTask.task_id
              ? {
                ...task,
                ...nextTask,
              }
              : task,
          ),
        })),
      );
    }

    setEditingTask(null);
  };

  const handleAddMember = (input: {
    member_name: string;
    member_role: string;
    columnColor: string;
  }) => {
    const newMember: Member = {
      member_id: crypto.randomUUID(),
      member_name: input.member_name,
      initials: getInitials(input.member_name),
      capacity_pct: 0,
      capacity_label: "0 件",
      due_today_count: 0,
      columnColor: input.columnColor,
      tasks: [],
    };

    setMembers(insertMemberByRoleOrder(rawMembers, newMember, input.member_role as MemberRole));

    const scheduleStore = loadScheduleStore();
    const exists = scheduleStore.members.some((member) => member.member_name === input.member_name);
    if (!exists) {
      saveScheduleStore({
        members: [...scheduleStore.members, createEmptyMemberSchedule(input.member_name)],
      });
    }
  };

  const handleAddProject = (input: {
    project_name: string;
    color: string;
    accentColor: string;
  }) => {
    setProjects([
      ...projects,
      {
        project_id: crypto.randomUUID(),
        project_name: input.project_name,
        color: input.color as TaskColor,
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
      description="メンバー別ボード、件数集計、現在の差配件数をまとめて確認できます。"
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/schedules"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            稼働申告ページへ
          </Link>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            完了タスクは24時間後にダッシュボードから自動非表示
          </div>
        </div>
      }
    >
      <DashboardHeader
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        roleFilter={roleFilter}
        onChangeRole={setRoleFilter}
        onOpenTaskModal={() => setIsTaskModalOpen(true)}
        onOpenMemberModal={() => setIsMemberModalOpen(true)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onReset={resetStore}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">全タスク数</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-900">{overview.totalTasks}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">ダッシュボード表示中</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-900">{overview.visibleDashboardTasks}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">期日が今日</p>
          <p className="mt-2 text-4xl font-extrabold text-amber-600">{overview.dueTodayCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">期日超過</p>
          <p className="mt-2 text-4xl font-extrabold text-red-600">{overview.overdueCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">完了済み総数</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-700">{overview.completedCount}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">メンバー別タスクボード</h2>
            <p className="mt-1 text-sm text-slate-500">
              優先度が高い順、同優先度では期日が近い順で並びます。
            </p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            表示中ステータス: {filterStatus === "all" ? "すべて" : filterStatus}
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {visibleMembers.map((member) => (
            <MemberColumn
              key={member.member_id}
              member={member}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onCompleteTask={handleCompleteTask}
              onDeleteMember={handleDeleteMember}
              onDropTask={handleDropTaskToMember}
              draggingTaskId={draggingTaskId}
              onDragStartTask={setDraggingTaskId}
              onDragEndTask={() => setDraggingTaskId(null)}
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-extrabold text-slate-900">メンバー別件数集計表</h2>
          <p className="mt-1 text-sm text-slate-500">役職フィルタを反映した件数一覧です。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                {["役職", "担当者", "未着手", "進行中", "完了", "保留", "合計"].map((label) => (
                  <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStatusSummary.map((row) => (
                <tr key={row.member_name} className="odd:bg-white even:bg-slate-50/60">
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                    {inferRoleFromName(row.member_name)}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                    {row.member_name}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.未着手}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.進行中}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.完了}</td>
                  <td className="border-b border-slate-100 px-4 py-3">{row.保留}</td>
                  <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                    {row.合計}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-extrabold text-slate-900">現在の差配件数マトリックス</h2>
          <p className="mt-1 text-sm text-slate-500">誰から誰に、現在何件のタスクが振られているかを集計しています。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                {["依頼者", "担当者", "件数"].map((label) => (
                  <th key={label} className="border-b border-slate-200 px-4 py-3 font-bold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignmentMatrix.map((row) => (
                <tr key={`${row.from}-${row.to}`} className="odd:bg-white even:bg-slate-50/60">
                  <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">
                    {row.from}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-800">
                    {row.to}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                    {row.count}
                  </td>
                </tr>
              ))}
              {assignmentMatrix.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                    集計対象タスクがありません
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
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