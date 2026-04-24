"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildAssignmentMatrix,
  createInitialAssignmentHistory,
  formatNow,
  getInitials,
  getProjectColor,
  getRoleOrder,
  getDashboardVisibleTasks,
  inferRoleFromName,
  isOverdue,
  useDashboardStore,
} from "@/lib/dashboard-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  createEmptyMemberSchedule,
  loadScheduleStore,
  saveScheduleStore,
} from "@/lib/schedule-utils";
import type {
  AssignmentHistoryItem,
  Member,
  MemberRole,
  NewTaskInput,
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

function getNextTaskId(members: Member[]) {
  const maxNumber = members
    .flatMap((member) => member.tasks)
    .map((task) => Number(task.task_id.replace(/[^0-9]/g, "")) || 0)
    .reduce((max, current) => Math.max(max, current), 0);

  return `T-${String(maxNumber + 1).padStart(3, "0")}`;
}

function getNextProjectCode(projects: { project_id: string }[]) {
  const maxNumber = projects
    .map((project) => Number(project.project_id.replace(/[^0-9]/g, "")) || 0)
    .reduce((max, current) => Math.max(max, current), 0);

  return `P-${String(maxNumber + 1).padStart(3, "0")}`;
}

async function getNextMemberCodeFromSupabase() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("members").select("member_code");

  if (error) {
    throw new Error(error.message);
  }

  const maxNumber = (data ?? [])
    .map((row) => Number(String(row.member_code ?? "").replace(/[^0-9]/g, "")) || 0)
    .reduce((max, current) => Math.max(max, current), 0);

  return `M-${String(maxNumber + 1).padStart(3, "0")}`;
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

function toHistoryInsertRows(taskDbId: string, history: AssignmentHistoryItem[]) {
  return history.map((item) => ({
    task_id: taskDbId,
    from_member_name: item.from,
    to_member_name: item.to,
    assignment_role: item.role,
    changed_at: item.changed_at,
  }));
}

async function findLatestTaskRowIdByTaskCode(taskCode: string): Promise<{ id: string } | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("task_code", taskCode)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data && data.length > 0 ? { id: data[0].id as string } : null;
}

async function findMemberRowId(memberId: string, memberName: string): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("members")
    .select("id")
    .or(`member_code.eq.${memberId},member_name.eq.${memberName}`)
    .order("display_order", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data && data.length > 0 ? (data[0].id as string) : null;
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
  } = useDashboardStore();

  const [mounted, setMounted] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<MemberRole | "all">("all");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      .filter((row) => roleFilter === "all" || inferRoleFromName(row.member_name) === roleFilter)
      .sort((a, b) => {
        const roleDiff =
          getRoleOrder(inferRoleFromName(a.member_name)) -
          getRoleOrder(inferRoleFromName(b.member_name));
        return roleDiff || a.member_name.localeCompare(b.member_name, "ja");
      });
  }, [roleFilter, statusSummary]);

  const sortedCapacityMembers = useMemo(() => {
    return [...members]
      .filter((member) => roleFilter === "all" || inferRoleFromName(member.member_name) === roleFilter)
      .sort((a, b) => {
        const roleDiff =
          getRoleOrder(inferRoleFromName(a.member_name)) -
          getRoleOrder(inferRoleFromName(b.member_name));
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
          .reduce((sum, task) => sum + (task.capacity_pct || 0), 0),
      ]),
    );
  }, [members]);

  const handleDeleteTask = async (taskId: string) => {
    try {
      const existingTaskRow = await findLatestTaskRowIdByTaskCode(taskId);

      if (!existingTaskRow) {
        alert("削除失敗: 対象タスクが見つかりません");
        return;
      }

      const supabase = getSupabaseClient();

      const { error: historyDeleteError } = await supabase
        .from("task_assignment_history")
        .delete()
        .eq("task_id", existingTaskRow.id);

      if (historyDeleteError) {
        console.error("❌ Supabase 履歴削除失敗", historyDeleteError);
        alert(`削除失敗: ${historyDeleteError.message}`);
        return;
      }

      const { error: taskDeleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", existingTaskRow.id);

      if (taskDeleteError) {
        console.error("❌ Supabase tasks 削除失敗", taskDeleteError);
        alert(`削除失敗: ${taskDeleteError.message}`);
        return;
      }

      setMembers(
        rawMembers.map((member) => ({
          ...member,
          tasks: member.tasks.filter((task) => task.task_id !== taskId),
        })),
      );
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `削除失敗: ${error.message}` : "削除失敗");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const completedAt = formatNow();

    try {
      const existingTaskRow = await findLatestTaskRowIdByTaskCode(taskId);

      if (!existingTaskRow) {
        alert("完了保存失敗: 対象タスクが見つかりません");
        return;
      }

      const supabase = getSupabaseClient();

      const { error: taskUpdateError } = await supabase
        .from("tasks")
        .update({
          status: "完了",
          progress_pct: 100,
          completed_at: completedAt,
        })
        .eq("id", existingTaskRow.id);

      if (taskUpdateError) {
        console.error("❌ Supabase tasks 完了更新失敗", taskUpdateError);
        alert(`完了保存失敗: ${taskUpdateError.message}`);
        return;
      }

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
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `完了保存失敗: ${error.message}` : "完了保存失敗");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const targetMember = rawMembers.find((member) => member.member_id === memberId);
    if (!targetMember) return;

    const hasTasks = targetMember.tasks.length > 0;
    const confirmed = window.confirm(
      hasTasks
        ? `${targetMember.member_name} を削除します。\nこのメンバーのタスクも一緒に削除されます。`
        : `${targetMember.member_name} を削除します。よろしいですか？`,
    );

    if (!confirmed) return;

    try {
      const supabase = getSupabaseClient();

      const taskCodes = targetMember.tasks.map((task) => task.task_id);

      if (taskCodes.length > 0) {
        const { data: taskRows, error: taskRowsError } = await supabase
          .from("tasks")
          .select("id")
          .in("task_code", taskCodes);

        if (taskRowsError) {
          console.error("❌ Supabase tasks 取得失敗", taskRowsError);
          alert(`メンバー削除失敗: ${taskRowsError.message}`);
          return;
        }

        const taskIds = (taskRows ?? []).map((row) => row.id as string);

        if (taskIds.length > 0) {
          const { error: historyDeleteError } = await supabase
            .from("task_assignment_history")
            .delete()
            .in("task_id", taskIds);

          if (historyDeleteError) {
            console.error("❌ Supabase 履歴削除失敗", historyDeleteError);
            alert(`メンバー削除失敗: ${historyDeleteError.message}`);
            return;
          }

          const { error: taskDeleteError } = await supabase
            .from("tasks")
            .delete()
            .in("id", taskIds);

          if (taskDeleteError) {
            console.error("❌ Supabase tasks 削除失敗", taskDeleteError);
            alert(`メンバー削除失敗: ${taskDeleteError.message}`);
            return;
          }
        }
      }

      const { error: scheduleDeleteError } = await supabase
        .from("schedules")
        .delete()
        .eq("member_name", targetMember.member_name);

      if (scheduleDeleteError) {
        console.error("❌ Supabase schedules 削除失敗", scheduleDeleteError);
        alert(`メンバー削除失敗: ${scheduleDeleteError.message}`);
        return;
      }

      const memberRowId = await findMemberRowId(targetMember.member_id, targetMember.member_name);

      if (memberRowId) {
        const { error: memberUpdateError } = await supabase
          .from("members")
          .update({ is_active: false })
          .eq("id", memberRowId);

        if (memberUpdateError) {
          console.error("❌ Supabase members 更新失敗", memberUpdateError);
          alert(`メンバー削除失敗: ${memberUpdateError.message}`);
          return;
        }
      }

      setMembers(rawMembers.filter((member) => member.member_id !== memberId));

      const scheduleStore = loadScheduleStore();
      saveScheduleStore({
        members: scheduleStore.members.filter((member) => member.member_name !== targetMember.member_name),
      });
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `メンバー削除失敗: ${error.message}` : "メンバー削除失敗");
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleAddTask = async (newTask: NewTaskInput) => {
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

    try {
      const supabase = getSupabaseClient();

      const { data: insertedTask, error: taskInsertError } = await supabase
        .from("tasks")
        .insert({
          task_code: nextTask.task_id,
          task_name: nextTask.task_name,
          project_name: nextTask.project_name,
          priority: nextTask.priority,
          status: nextTask.status,
          progress_pct: nextTask.progress_pct,
          manager_name: nextTask.manager,
          leader_name: nextTask.leader,
          assignee_name: nextTask.assignee,
          assigned_to: nextTask.assigned_to,
          capacity_pct: nextTask.capacity_pct,
          description: nextTask.description,
          flow_from: nextTask.flow_from,
          flow_to: nextTask.flow_to,
          accent_color: nextTask.accentColor,
          color: nextTask.color,
          due_date: nextTask.due_date || null,
          memo: nextTask.memo,
          completed_at: null,
        })
        .select("id")
        .single();

      if (taskInsertError) {
        console.error("❌ Supabase tasks 保存失敗", taskInsertError);
        alert(`Supabase保存失敗: ${taskInsertError.message}`);
        return;
      }

      if (insertedTask?.id && nextTask.assignment_history.length > 0) {
        const { error: historyInsertError } = await supabase
          .from("task_assignment_history")
          .insert(toHistoryInsertRows(insertedTask.id, nextTask.assignment_history));

        if (historyInsertError) {
          console.error("❌ Supabase task_assignment_history 保存失敗", historyInsertError);
          alert(`履歴保存失敗: ${historyInsertError.message}`);
          return;
        }
      }

      setMembers(
        rawMembers.map((member) => {
          if (member.member_name !== targetMemberName) return member;
          return {
            ...member,
            tasks: [...member.tasks, nextTask],
          };
        }),
      );
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `Supabaseエラー: ${error.message}` : "Supabaseエラー");
    }
  };

  const handleUpdateTask = async (updatedTask: UpdateTaskInput) => {
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
      completed_at: updatedTask.status === "完了" ? currentTask.completed_at ?? formatNow() : null,
    };

    const currentOwnerName = rawMembers.find((member) =>
      member.tasks.some((task) => task.task_id === updatedTask.task_id),
    )?.member_name;

    const ownerChanged = currentOwnerName !== targetMemberName;

    try {
      const existingTaskRow = await findLatestTaskRowIdByTaskCode(updatedTask.task_id);

      if (!existingTaskRow) {
        alert("Supabase更新失敗: 対象タスクが見つかりません");
        return;
      }

      const supabase = getSupabaseClient();

      const { error: taskUpdateError } = await supabase
        .from("tasks")
        .update({
          task_name: updatedTask.task_name,
          project_name: updatedTask.project_name,
          priority: updatedTask.priority,
          description: updatedTask.description,
          due_date: updatedTask.due_date || null,
          memo: updatedTask.memo,
          status: updatedTask.status,
          progress_pct: updatedTask.progress_pct,
          manager_name: updatedTask.manager,
          leader_name: updatedTask.leader,
          assignee_name: updatedTask.assignee,
          assigned_to: updatedTask.assignee,
          capacity_pct: updatedTask.capacity_pct,
          flow_from: updatedTask.leader || updatedTask.manager,
          flow_to: updatedTask.assignee,
          accent_color: projectColor.accentColor,
          color: projectColor.color,
          completed_at:
            updatedTask.status === "完了" ? currentTask.completed_at ?? formatNow() : null,
        })
        .eq("id", existingTaskRow.id);

      if (taskUpdateError) {
        console.error("❌ Supabase tasks 更新失敗", taskUpdateError);
        alert(`Supabase更新失敗: ${taskUpdateError.message}`);
        return;
      }

      if (ownerChanged && currentOwnerName) {
        const { error: historyInsertError } = await supabase
          .from("task_assignment_history")
          .insert({
            task_id: existingTaskRow.id,
            from_member_name: currentOwnerName,
            to_member_name: targetMemberName,
            assignment_role: "担当変更",
            changed_at: formatNow(),
          });

        if (historyInsertError) {
          console.error("❌ Supabase 履歴追加失敗", historyInsertError);
          alert(`履歴保存失敗: ${historyInsertError.message}`);
          return;
        }
      }

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
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `Supabaseエラー: ${error.message}` : "Supabaseエラー");
    }
  };

  const handleAddMember = async (input: {
    member_name: string;
    member_role: string;
    columnColor: string;
  }) => {
    const memberCode = await getNextMemberCodeFromSupabase();
    const newMember: Member = {
      member_id: memberCode,
      member_name: input.member_name,
      initials: getInitials(input.member_name),
      capacity_pct: 0,
      capacity_label: "0 件",
      due_today_count: 0,
      columnColor: input.columnColor,
      tasks: [],
    };

    try {
      const supabase = getSupabaseClient();

      const displayOrder = rawMembers.length > 0 ? rawMembers.length + 1 : 1;

      const { error } = await supabase
        .from("members")
        .insert({
          member_code: memberCode,
          member_name: input.member_name,
          initials: getInitials(input.member_name),
          role: input.member_role,
          column_color: input.columnColor,
          display_order: displayOrder,
          is_active: true,
        });

      if (error) {
        console.error("❌ Supabase members 保存失敗", error);
        alert(`メンバー保存失敗: ${error.message}`);
        return;
      }

      setMembers(insertMemberByRoleOrder(rawMembers, newMember, input.member_role as MemberRole));

      const scheduleStore = loadScheduleStore();
      const exists = scheduleStore.members.some((member) => member.member_name === input.member_name);
      if (!exists) {
        saveScheduleStore({
          members: [...scheduleStore.members, createEmptyMemberSchedule(input.member_name)],
        });
      }
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `メンバー保存失敗: ${error.message}` : "メンバー保存失敗");
    }
  };

  const handleAddProject = async (input: {
    project_name: string;
    color: string;
    accentColor: string;
  }) => {
    const projectCode = getNextProjectCode(projects);

    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from("projects")
        .insert({
          project_code: projectCode,
          project_name: input.project_name,
          color: input.color as TaskColor,
          accent_color: input.accentColor,
          is_active: true,
        });

      if (error) {
        console.error("❌ Supabase projects 保存失敗", error);
        alert(`プロジェクト保存失敗: ${error.message}`);
        return;
      }

      setProjects([
        ...projects,
        {
          project_id: projectCode,
          project_name: input.project_name,
          color: input.color as TaskColor,
          accentColor: input.accentColor,
        },
      ]);
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `プロジェクト保存失敗: ${error.message}` : "プロジェクト保存失敗");
    }
  };

  const handleDropTaskToMember = async (targetMemberName: string) => {
    if (!draggingTaskId) return;

    const sourceMember = rawMembers.find((member) =>
      member.tasks.some((task) => task.task_id === draggingTaskId),
    );
    const currentTask = rawMembers
      .flatMap((member) => member.tasks)
      .find((task) => task.task_id === draggingTaskId);

    if (!sourceMember || !currentTask) {
      setDraggingTaskId(null);
      return;
    }

    if (sourceMember.member_name === targetMemberName) {
      setDraggingTaskId(null);
      return;
    }

    try {
      const existingTaskRow = await findLatestTaskRowIdByTaskCode(draggingTaskId);

      if (!existingTaskRow) {
        alert("担当変更失敗: 対象タスクが見つかりません");
        setDraggingTaskId(null);
        return;
      }

      const supabase = getSupabaseClient();

      const { error: taskUpdateError } = await supabase
        .from("tasks")
        .update({
          assignee_name: targetMemberName,
          assigned_to: targetMemberName,
          flow_from: sourceMember.member_name,
          flow_to: targetMemberName,
        })
        .eq("id", existingTaskRow.id);

      if (taskUpdateError) {
        console.error("❌ Supabase tasks 担当変更失敗", taskUpdateError);
        alert(`担当変更失敗: ${taskUpdateError.message}`);
        setDraggingTaskId(null);
        return;
      }

      const { error: historyInsertError } = await supabase
        .from("task_assignment_history")
        .insert({
          task_id: existingTaskRow.id,
          from_member_name: sourceMember.member_name,
          to_member_name: targetMemberName,
          assignment_role: "担当変更",
          changed_at: formatNow(),
        });

      if (historyInsertError) {
        console.error("❌ Supabase 履歴追加失敗", historyInsertError);
        alert(`履歴保存失敗: ${historyInsertError.message}`);
        setDraggingTaskId(null);
        return;
      }

      setMembers(moveTaskBetweenMembers(rawMembers, draggingTaskId, targetMemberName));
      setDraggingTaskId(null);
    } catch (error) {
      console.error("❌ Supabaseエラー", error);
      alert(error instanceof Error ? `担当変更失敗: ${error.message}` : "担当変更失敗");
      setDraggingTaskId(null);
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
                      .reduce((sum, task) => sum + (task.capacity_pct || 0), 0)}
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