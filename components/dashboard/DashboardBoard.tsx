"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import {
  getAssigneeNames,
  getCapacityForMember,
  getPrimaryAssigneeName,
  getPrimaryCapacityPct,
  joinAssigneeNames,
  moveAssigneeCapacity,
  normalizeAssigneeCapacities,
  replaceAssigneeName,
} from "@/lib/dashboard-assignees";
import {
  buildAssignmentMatrix,
  createInitialAssignmentHistory,
  formatNow,
  getInitials,
  getProjectColor,
  getRoleOrder,
  getDashboardVisibleTasks,
  isOverdue,
  useDashboardStore,
} from "@/lib/dashboard-store";
import {
  completeDashboardTask,
  deleteDashboardMemberWithRelatedData,
  deleteDashboardTask,
  getNextMemberCodeFromSupabase,
  getNextProjectCodeFromSupabase,
  getNextTaskCodeFromSupabase,
  insertDashboardMember,
  insertDashboardProject,
  insertDashboardTask,
  insertSingleTaskAssignmentHistory,
  insertTaskAssignmentHistory,
  removeMemberFromDashboardTaskAssignees,
  updateDashboardTaskAssignee,
  updateDashboardTaskByCode,
} from "@/lib/supabase/dashboard-writer";
import { subscribeToTasks } from "@/lib/supabase/realtime-listener";
import type {
  Member,
  MemberRole,
  NewTaskInput,
  Task,
  TaskColor,
  TaskStatus,
  UpdateTaskInput,
  AssignmentHistoryItem,
} from "@/types/dashboard";

import { AppShell } from "./AppShell";
import { DashboardHeader } from "./DashboardHeader";
import { MemberAddModal } from "./MemberAddModal";
import { MemberColumn } from "./MemberColumn";
import { ProjectAddModal } from "./ProjectAddModal";
import { TaskAddModal } from "./TaskAddModal";
import { TaskEditModal } from "./TaskEditModal";

function moveTaskBetweenMembers(
  members: Member[],
  taskId: string,
  sourceMemberName: string,
  targetMemberName: string,
  partialUpdate?: Partial<Task>,
) {
  const sourceTask = members
    .flatMap((member) => member.tasks)
    .find((task) => task.task_id === taskId);

  if (!sourceTask) return members;

  const currentNames = getAssigneeNames(sourceTask.assigned_to || sourceTask.assignee);
  const nextNames = replaceAssigneeName(currentNames, sourceMemberName, targetMemberName);
  const nextAssignedTo = joinAssigneeNames(nextNames);
  const movedCapacities = moveAssigneeCapacity(
    sourceTask.capacity_by_assignee,
    sourceMemberName,
    targetMemberName,
    sourceTask.capacity_pct,
  );
  const nextCapacityByAssignee = normalizeAssigneeCapacities(nextNames, movedCapacities, sourceTask.capacity_pct);
  const shouldAppendHistory = sourceMemberName && sourceMemberName !== targetMemberName;
  const nextHistory = shouldAppendHistory
    ? [
      ...sourceTask.assignment_history,
      {
        from: sourceMemberName,
        to: targetMemberName,
        role: "担当変更" as const,
        changed_at: formatNow(),
      },
    ]
    : sourceTask.assignment_history;

  const movedTask: Task = {
    ...sourceTask,
    ...partialUpdate,
    assignee: nextAssignedTo,
    assigned_to: nextAssignedTo,
    capacity_pct: getPrimaryCapacityPct(nextNames, nextCapacityByAssignee),
    capacity_by_assignee: nextCapacityByAssignee,
    flow_from: shouldAppendHistory ? sourceMemberName : partialUpdate?.flow_from ?? sourceTask.flow_from,
    flow_to: partialUpdate?.flow_to ?? targetMemberName,
    assignment_history: nextHistory,
  };

  return members.map((member) => {
    const shouldHaveTask = nextNames.includes(member.member_name);
    const currentTasksWithoutMoved = member.tasks.filter((task) => task.task_id !== taskId);

    if (!shouldHaveTask) {
      return { ...member, tasks: currentTasksWithoutMoved };
    }

    return {
      ...member,
      tasks: [...currentTasksWithoutMoved, movedTask],
    };
  });
}

function getFallbackMemberName(
  members: Member[],
  input: Pick<NewTaskInput, "assignee" | "leader" | "manager">,
) {
  return (
    getPrimaryAssigneeName(input.assignee) ||
    input.leader ||
    input.manager ||
    members.find((member) => member.role === "Lead")?.member_name ||
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
    const currentRoleOrder = getRoleOrder(members[i].role);
    if (currentRoleOrder > targetRoleOrder) {
      insertIndex = i;
      break;
    }
  }

  return [...members.slice(0, insertIndex), newMember, ...members.slice(insertIndex)];
}

function replaceTaskAcrossMembers(members: Member[], taskId: string, nextTask: Task) {
  const nextAssigneeNames = getAssigneeNames(nextTask.assigned_to || nextTask.assignee);

  return members.map((member) => {
    const tasksWithoutTarget = member.tasks.filter((task) => task.task_id !== taskId);

    if (!nextAssigneeNames.includes(member.member_name)) {
      return { ...member, tasks: tasksWithoutTarget };
    }

    return {
      ...member,
      tasks: [...tasksWithoutTarget, nextTask],
    };
  });
}

function uniqueAssigneeNames(names: string[]) {
  return Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
}

function buildAssigneeEditHistory(input: {
  beforeAssignees: string[];
  afterAssignees: string[];
  managerName: string;
  leaderName: string;
  changedAt: string;
}): AssignmentHistoryItem[] {
  const beforeAssignees = uniqueAssigneeNames(input.beforeAssignees);
  const afterAssignees = uniqueAssigneeNames(input.afterAssignees);
  const addedAssignees = afterAssignees.filter((name) => !beforeAssignees.includes(name));
  const removedAssignees = beforeAssignees.filter((name) => !afterAssignees.includes(name));
  const editorName = input.leaderName || input.managerName || "Lead";

  return [
    ...addedAssignees.map((name) => ({
      from: editorName,
      to: name,
      role: "担当者追加" as const,
      changed_at: input.changedAt,
    })),
    ...removedAssignees.map((name) => ({
      from: name,
      to: "担当解除",
      role: "担当者解除" as const,
      changed_at: input.changedAt,
    })),
  ];
}

export function DashboardBoard() {
  const { showToast } = useToast();

  const {
    members,
    rawMembers,
    projects,
    tasks,
    dashboardTasks,
    statusSummary,
    setMembers,
    setProjects,
  } = useDashboardStore();

  const [mounted, setMounted] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [draggingSourceMemberName, setDraggingSourceMemberName] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const mutationInFlightRef = useRef(false);
  const suppressRealtimeUntilRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showBusyToast = () => {
    showToast("処理中です。完了してから再度お試しください。", "info");
  };

  const markLocalMutation = () => {
    suppressRealtimeUntilRef.current = Date.now() + 2500;
  };

  useEffect(() => {
    const channel = subscribeToTasks(() => {
      if (Date.now() < suppressRealtimeUntilRef.current) {
        return;
      }

      showToast("他のユーザーがタスクを更新しました");
    });

    return () => {
      channel.unsubscribe();
    };
  }, [showToast]);

  const visibleMembers = useMemo(() => {
    const filteredByRole =
      roleFilter === "all"
        ? members
        : members.filter((member) => member.role === roleFilter);

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
      (task) =>
        task.status !== "完了" &&
        task.due_date &&
        task.due_date.slice(0, 10) === new Date().toISOString().slice(0, 10),
    ).length;

    return {
      totalTasks: tasks.length,
      visibleDashboardTasks: dashboardTasks.length,
      overdueCount,
      dueTodayCount,
    };
  }, [dashboardTasks, tasks.length]);

  const sortedStatusSummary = useMemo(() => {
    return [...statusSummary]
      .filter((row) => roleFilter === "all" || row.role === roleFilter)
      .sort((a, b) => {
        const roleDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
        return roleDiff || a.member_name.localeCompare(b.member_name, "ja");
      });
  }, [roleFilter, statusSummary]);

  const sortedCapacityMembers = useMemo(() => {
    return [...members]
      .filter((member) => roleFilter === "all" || member.role === roleFilter)
      .sort((a, b) => {
        const roleDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
        return roleDiff || a.member_name.localeCompare(b.member_name, "ja");
      });
  }, [members, roleFilter]);

  const assignmentMatrix = useMemo(() => buildAssignmentMatrix(tasks), [tasks]);

  const totalCapacityByMemberId = useMemo(() => {
    return new Map(
      members.map((member) => [
        member.member_id,
        member.tasks
          .filter((task) => task.status !== "完了")
          .reduce((sum, task) => sum + getCapacityForMember(task, member.member_name), 0),
      ]),
    );
  }, [members]);

  const handleDeleteTask = async (taskId: string) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    try {
      await deleteDashboardTask(taskId);

      setMembers(
        rawMembers.map((member) => ({
          ...member,
          tasks: member.tasks.filter((task) => task.task_id !== taskId),
        })),
      );
      showToast("タスクを削除しました", "success");
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `削除失敗: ${error.message}` : "削除失敗", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    const completedAt = formatNow();

    try {
      await completeDashboardTask(taskId, completedAt);

      setMembers(
        rawMembers.map((member) => ({
          ...member,
          tasks: member.tasks.map((task) =>
            task.task_id === taskId
              ? {
                ...task,
                status: "完了",
                progress_pct: 100,
                completed_at: completedAt,
              }
              : task,
          ),
        })),
      );
      showToast("タスクを完了にしました", "success");
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `完了保存失敗: ${error.message}` : "完了保存失敗", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    const targetMember = rawMembers.find((member) => member.member_id === memberId);
    if (!targetMember) return;

    const hasTasks = targetMember.tasks.length > 0;
    const confirmed = window.confirm(
      hasTasks
        ? `${targetMember.member_name} を削除します。\nこのメンバーのタスクも一緒に削除されます。`
        : `${targetMember.member_name} を削除します。よろしいですか？`,
    );

    if (!confirmed) return;

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    try {
      const soleAssigneeTaskCodes = targetMember.tasks
        .filter((task) => getAssigneeNames(task.assigned_to || task.assignee).length <= 1)
        .map((task) => task.task_id);

      await removeMemberFromDashboardTaskAssignees(targetMember.member_name);

      await deleteDashboardMemberWithRelatedData({
        memberId: targetMember.member_id,
        memberName: targetMember.member_name,
        taskCodes: soleAssigneeTaskCodes,
      });

      setMembers(rawMembers.filter((member) => member.member_id !== memberId));
      showToast("メンバーを削除しました", "success");
      window.dispatchEvent(new Event("dashboard-store-updated"));
      window.dispatchEvent(new Event("schedule-store-updated"));
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `メンバー削除失敗: ${error.message}` : "メンバー削除失敗", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleAddTask = async (newTask: NewTaskInput) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    const leadName = newTask.leader || newTask.manager;
    const projectColor = getProjectColor(newTask.project_name, projects);
    const targetMemberName = getFallbackMemberName(rawMembers, {
      ...newTask,
      manager: leadName,
      leader: leadName,
    });

    if (!targetMemberName) {
      mutationInFlightRef.current = false;
      setIsMutating(false);
      return;
    }

    try {
      const taskCode = await getNextTaskCodeFromSupabase();

      const nextTask: Task = {
        task_id: taskCode,
        task_name: newTask.task_name,
        project_name: newTask.project_name,
        priority: newTask.priority,
        status: "未着手",
        progress_pct: 0,
        manager: leadName,
        leader: leadName,
        assignee: newTask.assignee,
        capacity_pct: newTask.capacity_pct,
        capacity_by_assignee: newTask.capacity_by_assignee,
        assigned_to: newTask.assignee,
        description: newTask.description,
        flow_from: leadName,
        flow_to: newTask.assignee,
        accentColor: projectColor.accentColor,
        color: projectColor.color,
        due_date: newTask.due_date,
        memo: newTask.memo,
        completed_at: null,
        assignment_history: createInitialAssignmentHistory({
          ...newTask,
          manager: leadName,
          leader: leadName,
        }),
      };

      const insertedTask = await insertDashboardTask({
        task_code: nextTask.task_id,
        task_name: nextTask.task_name,
        project_name: nextTask.project_name,
        priority: nextTask.priority,
        status: nextTask.status,
        progress_pct: nextTask.progress_pct,
        manager_name: leadName,
        leader_name: leadName,
        assignee_name: nextTask.assignee,
        assigned_to: nextTask.assigned_to,
        capacity_pct: nextTask.capacity_pct,
        capacity_by_assignee: nextTask.capacity_by_assignee ?? {},
        description: nextTask.description,
        flow_from: nextTask.flow_from,
        flow_to: nextTask.flow_to,
        accent_color: nextTask.accentColor,
        color: nextTask.color,
        due_date: nextTask.due_date || null,
        memo: nextTask.memo,
        completed_at: null,
      });

      await insertTaskAssignmentHistory(insertedTask.id, nextTask.assignment_history);

      setMembers(
        rawMembers.map((member) => {
          if (member.member_name !== targetMemberName) return member;
          return {
            ...member,
            tasks: [...member.tasks, nextTask],
          };
        }),
      );
      window.dispatchEvent(new Event("dashboard-store-updated"));
      showToast("タスクを追加しました", "success");
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `Supabaseエラー: ${error.message}` : "Supabaseエラー", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleUpdateTask = async (updatedTask: UpdateTaskInput) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    const leadName = updatedTask.leader || updatedTask.manager;
    const projectColor = getProjectColor(updatedTask.project_name, projects);
    const currentTask = rawMembers
      .flatMap((member) => member.tasks)
      .find((task) => task.task_id === updatedTask.task_id);

    if (!currentTask) {
      mutationInFlightRef.current = false;
      setIsMutating(false);
      return;
    }

    const nextAssigneeNames = uniqueAssigneeNames(getAssigneeNames(updatedTask.assignee));
    const targetMemberName = getFallbackMemberName(rawMembers, {
      ...updatedTask,
      manager: leadName,
      leader: leadName,
    });

    if (!targetMemberName || nextAssigneeNames.length === 0) {
      mutationInFlightRef.current = false;
      setIsMutating(false);
      return;
    }

    const changedAt = formatNow();
    const previousAssigneeNames = uniqueAssigneeNames(getAssigneeNames(currentTask.assigned_to || currentTask.assignee));
    const assigneeEditHistory = buildAssigneeEditHistory({
      beforeAssignees: previousAssigneeNames,
      afterAssignees: nextAssigneeNames,
      managerName: leadName,
      leaderName: leadName,
      changedAt,
    });

    const nextTask: Task = {
      ...currentTask,
      task_name: updatedTask.task_name,
      project_name: updatedTask.project_name,
      priority: updatedTask.priority,
      description: updatedTask.description,
      due_date: updatedTask.due_date,
      memo: updatedTask.memo,
      status: updatedTask.status,
      progress_pct: updatedTask.progress_pct,
      manager: leadName,
      leader: leadName,
      assignee: joinAssigneeNames(nextAssigneeNames),
      assigned_to: joinAssigneeNames(nextAssigneeNames),
      capacity_pct: updatedTask.capacity_pct,
      capacity_by_assignee: updatedTask.capacity_by_assignee,
      flow_from:
        assigneeEditHistory.length > 0
          ? assigneeEditHistory[assigneeEditHistory.length - 1].from
          : leadName,
      flow_to:
        assigneeEditHistory.length > 0
          ? assigneeEditHistory[assigneeEditHistory.length - 1].to
          : joinAssigneeNames(nextAssigneeNames),
      accentColor: projectColor.accentColor,
      color: projectColor.color,
      completed_at: updatedTask.status === "完了" ? currentTask.completed_at ?? changedAt : null,
      assignment_history: [...currentTask.assignment_history, ...assigneeEditHistory],
    };

    try {
      const taskRow = await updateDashboardTaskByCode(updatedTask.task_id, {
        task_name: updatedTask.task_name,
        project_name: updatedTask.project_name,
        priority: updatedTask.priority,
        description: updatedTask.description,
        due_date: updatedTask.due_date || null,
        memo: updatedTask.memo,
        status: updatedTask.status,
        progress_pct: updatedTask.progress_pct,
        manager_name: leadName,
        leader_name: leadName,
        assignee_name: joinAssigneeNames(nextAssigneeNames),
        assigned_to: joinAssigneeNames(nextAssigneeNames),
        capacity_pct: updatedTask.capacity_pct,
        capacity_by_assignee: updatedTask.capacity_by_assignee,
        flow_from: nextTask.flow_from,
        flow_to: nextTask.flow_to,
        accent_color: projectColor.accentColor,
        color: projectColor.color,
        completed_at: updatedTask.status === "完了" ? currentTask.completed_at ?? changedAt : null,
      });

      for (const history of assigneeEditHistory) {
        await insertSingleTaskAssignmentHistory({
          taskDbId: taskRow.id,
          from_member_name: history.from,
          to_member_name: history.to,
          assignment_role: history.role,
          changed_at: history.changed_at,
        });
      }

      nextTask.updated_at = taskRow.updated_at;

      setMembers(replaceTaskAcrossMembers(rawMembers, updatedTask.task_id, nextTask));

      window.dispatchEvent(new Event("dashboard-store-updated"));
      showToast("タスクを更新しました", "success");
      setEditingTask(null);
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `Supabaseエラー: ${error.message}` : "Supabaseエラー", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleAddMember = async (input: {
    member_name: string;
    member_role: string;
    columnColor: string;
  }) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    try {
      const memberCode = await getNextMemberCodeFromSupabase();

      const newMember: Member = {
        member_id: memberCode,
        member_name: input.member_name,
        role: input.member_role as MemberRole,
        initials: getInitials(input.member_name),
        capacity_pct: 0,
        capacity_label: "0 件",
        due_today_count: 0,
        columnColor: input.columnColor,
        tasks: [],
      };

      const displayOrder = rawMembers.length > 0 ? rawMembers.length + 1 : 1;

      await insertDashboardMember({
        member_code: memberCode,
        member_name: input.member_name,
        initials: getInitials(input.member_name),
        role: input.member_role,
        column_color: input.columnColor,
        display_order: displayOrder,
        is_active: true,
      });

      setMembers(insertMemberByRoleOrder(rawMembers, newMember, input.member_role as MemberRole));
      showToast("メンバーを追加しました", "success");
      window.dispatchEvent(new Event("dashboard-store-updated"));
      window.dispatchEvent(new Event("schedule-store-updated"));
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `メンバー保存失敗: ${error.message}` : "メンバー保存失敗", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleAddProject = async (input: {
    project_name: string;
    color: string;
    accentColor: string;
  }) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    try {
      const projectCode = await getNextProjectCodeFromSupabase();

      await insertDashboardProject({
        project_code: projectCode,
        project_name: input.project_name,
        color: input.color as TaskColor,
        accent_color: input.accentColor,
        is_active: true,
      });

      setProjects([
        ...projects,
        {
          project_id: projectCode,
          project_name: input.project_name,
          color: input.color as TaskColor,
          accentColor: input.accentColor,
        },
      ]);
      showToast("プロジェクトを追加しました", "success");
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `プロジェクト保存失敗: ${error.message}` : "プロジェクト保存失敗", "error");
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  const handleDropTaskToMember = async (targetMemberName: string) => {
    if (mutationInFlightRef.current || isMutating) {
      showBusyToast();
      return;
    }

    if (!draggingTaskId || !draggingSourceMemberName) return;

    const sourceMember = rawMembers.find((member) => member.member_name === draggingSourceMemberName);

    const currentTask = rawMembers
      .flatMap((member) => member.tasks)
      .find((task) => task.task_id === draggingTaskId);

    if (!sourceMember || !currentTask) {
      setDraggingTaskId(null);
      setDraggingSourceMemberName(null);
      return;
    }

    if (sourceMember.member_name === targetMemberName) {
      setDraggingTaskId(null);
      setDraggingSourceMemberName(null);
      return;
    }

    mutationInFlightRef.current = true;
    setIsMutating(true);
    markLocalMutation();

    try {
      await updateDashboardTaskAssignee({
        taskCode: draggingTaskId,
        sourceMemberName: draggingSourceMemberName,
        targetMemberName,
        changedAt: formatNow(),
      });

      window.dispatchEvent(new Event("dashboard-store-updated"));
      showToast("担当者を変更しました", "success");
      setDraggingTaskId(null);
      setDraggingSourceMemberName(null);
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      showToast(error instanceof Error ? `担当変更失敗: ${error.message}` : "担当変更失敗", "error");
      setDraggingTaskId(null);
      setDraggingSourceMemberName(null);
    } finally {
      mutationInFlightRef.current = false;
      setIsMutating(false);
    }
  };

  if (!mounted) {
    return (
      <AppShell title="タスク・キャパシティ管理ダッシュボード" description="読み込み中です。">
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="タスク・キャパシティ管理ダッシュボード"
      description="メンバー別ボード、件数集計、キャパシティ集計、現在の差配件数をまとめて確認できます。"
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
      />

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">メンバー別タスクボード</h2>
            <p className="mt-1 text-sm text-slate-500">
              優先度が高い順、同優先度では期日が近い順、完了済みは最下部に並びます。
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
              totalCapacityPct={totalCapacityByMemberId.get(member.member_id) ?? 0}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onCompleteTask={handleCompleteTask}
              onDeleteMember={handleDeleteMember}
              onDropTask={handleDropTaskToMember}
              draggingTaskId={draggingTaskId}
              onDragStartTask={(taskId, sourceMemberName) => {
                setDraggingTaskId(taskId);
                setDraggingSourceMemberName(sourceMemberName);
              }}
              onDragEndTask={() => {
                setDraggingTaskId(null);
                setDraggingSourceMemberName(null);
              }}
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
                    {row.role}
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
          <h2 className="text-xl font-extrabold text-slate-900">キャパシティ集計表</h2>
          <p className="mt-1 text-sm text-slate-500">メンバーごとの合計キャパシティを表示します。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full max-w-xl border-collapse text-sm">
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
              {sortedCapacityMembers.map((member) => (
                <tr key={member.member_id} className="odd:bg-white even:bg-slate-50/60">
                  <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                    {member.member_name}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900">
                    {member.tasks
                      .filter((task) => task.status !== "完了")
                      .reduce((sum, task) => sum + getCapacityForMember(task, member.member_name), 0)}
                    %
                  </td>
                </tr>
              ))}
              {sortedCapacityMembers.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-sm text-slate-400">
                    表示対象メンバーがいません
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xl font-extrabold text-slate-900">現在の差配件数マトリックス</h2>
          <p className="mt-1 text-sm text-slate-500">
            誰から誰に、現在何件のタスクが振られているかを集計しています。
          </p>
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