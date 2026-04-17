"use client";

import { useEffect, useMemo, useState } from "react";
import { mockMembers } from "@/data/mock-data";
import type {
  Member,
  NewTaskInput,
  Task,
  TaskColor,
  UpdateTaskInput,
  Project,
} from "@/types/dashboard";

import { MemberColumn } from "./MemberColumn";
import { DashboardHeader } from "./DashboardHeader";
import { TaskAddModal } from "./TaskAddModal";
import { TaskEditModal } from "./TaskEditModal";
import { MemberAddModal } from "./MemberAddModal";
import { ProjectAddModal } from "./ProjectAddModal";

const projectColorMap: Record<string, { color: TaskColor; accentColor: string }> = {
  基盤刷新: { color: "blue", accentColor: "bg-blue-500" },
  管理画面改善: { color: "green", accentColor: "bg-green-500" },
  調査対応: { color: "orange", accentColor: "bg-orange-500" },
  データ整備: { color: "cyan", accentColor: "bg-cyan-500" },
  インフラ改善: { color: "red", accentColor: "bg-red-500" },
  その他: { color: "slate", accentColor: "bg-slate-500" },
};

const getProjectColor = (projectName: string) => {
  return projectColorMap[projectName] ?? projectColorMap["その他"];
};

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "新";
  return trimmed.slice(0, 1);
};

export function DashboardBoard() {
  const [selectedRange, setSelectedRange] = useState("今週");

  const [members, setMembers] = useState<Member[]>(() => {
    if (typeof window === "undefined") return mockMembers;

    const saved = window.localStorage.getItem("dashboard-members");
    return saved ? JSON.parse(saved) : mockMembers;
  });

  const [projects, setProjects] = useState<Project[]>([
    {
      project_id: "p1",
      project_name: "基盤刷新",
      color: "blue",
      accentColor: "bg-blue-500",
    },
    {
      project_id: "p2",
      project_name: "管理画面改善",
      color: "green",
      accentColor: "bg-green-500",
    },
  ]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("dashboard-members", JSON.stringify(members));
  }, [members]);

  const visibleMembers = useMemo(() => {
    return members.map((member) => ({
      ...member,
      tasks: member.tasks.filter((task) => {
        if (filterStatus !== "all" && task.status !== filterStatus) return false;
        if (search && !task.task_name.includes(search)) return false;
        return true;
      }),
    }));
  }, [members, filterStatus, search]);

  // D&D系
  const handleDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };

  const handleDropTaskToMember = (targetMemberName: string) => {
    if (!draggingTaskId) return;

    setMembers((prev) => {
      let movedTask: Task | null = null;
      let fromMember = "";

      const removed = prev.map((m) => {
        const found = m.tasks.find((t) => t.task_id === draggingTaskId);
        if (!found) return m;

        movedTask = found;
        fromMember = m.member_name;

        return {
          ...m,
          tasks: m.tasks.filter((t) => t.task_id !== draggingTaskId),
        };
      });

      if (!movedTask) return prev;

      return removed.map((m) => {
        if (m.member_name !== targetMemberName) return m;

        return {
          ...m,
          tasks: [
            ...m.tasks,
            {
              ...movedTask!,
              assigned_to: targetMemberName,
              flow_from: fromMember,
              flow_to: targetMemberName,
              assignment_history: [
                ...movedTask!.assignment_history,
                {
                  from: fromMember,
                  to: targetMemberName,
                  changed_at: new Date().toLocaleString(),
                },
              ],
            },
          ],
        };
      });
    });

    setDraggingTaskId(null);
  };

  // ===== その他 =====
  const handleDeleteTask = (taskId: string) => {
    setMembers((prev) =>
      prev.map((m) => ({
        ...m,
        tasks: m.tasks.filter((t) => t.task_id !== taskId),
      }))
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleAddTask = (newTask: any) => {
    const projectColor = getProjectColor(newTask.project_name);

    setMembers((prev) =>
      prev.map((m) => {
        if (m.member_name !== newTask.assignee) return m;

        return {
          ...m,
          tasks: [
            ...m.tasks,
            {
              task_id: crypto.randomUUID(),

              task_name: newTask.task_name,
              project_name: newTask.project_name,

              status: "未着手",
              progress_pct: 0,              
              manager: newTask.manager,
              leader: newTask.leader,
              assignee: newTask.assignee,
              capacity_pct: newTask.capacity_pct,

              assigned_to: newTask.assignee,

              description: newTask.description,

              flow_from: newTask.manager,
              flow_to: newTask.assignee,

              accentColor: projectColor.accentColor,
              color: projectColor.color,

              due_date: newTask.due_date,
              memo: newTask.memo,

              assignment_history: [],
            },
          ],
        };
      })
    );
  };

  const handleUpdateTask = (updatedTask: UpdateTaskInput) => {
    setMembers((prev) =>
      prev.map((member) => ({
        ...member,
        tasks: member.tasks.map((task) => {
          if (task.task_id !== updatedTask.task_id) return task;

          return {
            ...task,

            task_name: updatedTask.task_name,
            project_name: updatedTask.project_name,
            description: updatedTask.description,
            due_date: updatedTask.due_date,
            memo: updatedTask.memo,

            status: updatedTask.status,
            progress_pct: updatedTask.progress_pct,
            manager: updatedTask.manager,
            leader: updatedTask.leader,
            assignee: updatedTask.assignee,
            capacity_pct: updatedTask.capacity_pct,

            assigned_to: updatedTask.assignee,
          };
        }),
      }))
    );

    setEditingTask(null);
  };

  const handleAddMember = (input: any) => {
    setMembers((prev) => [
      ...prev,
      {
        member_id: crypto.randomUUID(),
        member_name: input.member_name,
        initials: input.member_name.slice(0, 1),
        capacity_pct: 0,
        capacity_label: "0 / 100",
        columnColor: input.columnColor,
        tasks: [],
      },
    ]);
  };

  const handleAddProject = (input: {
    project_name: string;
    color: TaskColor;
  }) => {
    const accentMap: Record<TaskColor, string> = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      orange: "bg-orange-500",
      purple: "bg-purple-500",
      red: "bg-red-500",
      cyan: "bg-cyan-500",
      slate: "bg-slate-500",
    };

    setProjects((prev) => [
      ...prev,
      {
        project_id: crypto.randomUUID(),
        project_name: input.project_name,
        color: input.color,
        accentColor: accentMap[input.color],
      },
    ]);
  };

  return (
    <>
      <DashboardHeader
        selectedRange={selectedRange}
        onChangeRange={setSelectedRange}
        onOpenTaskModal={() => setIsTaskModalOpen(true)}
        onOpenMemberModal={() => setIsMemberModalOpen(true)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        filterStatus={filterStatus}
        onChangeStatus={setFilterStatus}
        search={search}
        onChangeSearch={setSearch}
      />

      <div className="flex gap-4 overflow-x-auto p-4">
        {visibleMembers.map((member) => (
          <MemberColumn
            key={member.member_id}
            member={member}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDropTask={handleDropTaskToMember}
            draggingTaskId={draggingTaskId}
            onDragStartTask={handleDragStart}
            onDragEndTask={handleDragEnd}
          />
        ))}
      </div>

      <TaskAddModal
        isOpen={isTaskModalOpen}
        members={members}
        projects={projects}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleAddTask}
      />

      <TaskEditModal
        isOpen={Boolean(editingTask)}
        task={editingTask}
        projects={projects}
        members={members}
        onClose={() => setEditingTask(null)}
        onSubmit={() => { }}
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
    </>
  );
}