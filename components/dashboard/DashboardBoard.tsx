"use client";

import { useEffect, useMemo, useState } from "react";
import { mockMembers } from "@/data/mock-data";
import type {
  Member,
  NewTaskInput,
  Task,
  TaskColor,
  UpdateTaskInput,
} from "@/types/dashboard";
import { MemberColumn } from "./MemberColumn";
import { DashboardHeader } from "./DashboardHeader";
import { TaskAddModal } from "./TaskAddModal";
import { TaskEditModal } from "./TaskEditModal";

const colorToAccentMap: Record<TaskColor, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  cyan: "bg-cyan-500",
};

export function DashboardBoard() {
  const [selectedRange, setSelectedRange] = useState("今週");
  const [members, setMembers] = useState<Member[]>(() => {
    if (typeof window === "undefined") return mockMembers;

    const savedMembers = window.localStorage.getItem("dashboard-members");

    if (!savedMembers) return mockMembers;

    try {
      return JSON.parse(savedMembers) as Member[];
    } catch {
      return mockMembers;
    }
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  
  useEffect(() => {
    window.localStorage.setItem("dashboard-members", JSON.stringify(members));
  }, [members]);

  const visibleMembers = useMemo(() => {
    return members.map((member) => {
      const filteredTasks = member.tasks
        .filter((task) => {
          if (filterStatus !== "all" && task.status !== filterStatus) {
            return false;
          }

          if (
            search.trim() &&
            !task.task_name.toLowerCase().includes(search.toLowerCase())
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      return {
        ...member,
        tasks: filteredTasks,
      };
    });
  }, [members, filterStatus, search, selectedRange]);

  const handleAddTask = (newTask: NewTaskInput) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) => {
        if (member.member_name !== newTask.assigned_to) return member;

        const createdTask: Task = {
          task_id: `task-${crypto.randomUUID()}`,
          task_name: newTask.task_name,
          status: "未着手",
          progress_pct: 0,
          assigned_to: newTask.assigned_to,
          description: newTask.description,
          flow_from: "管理者",
          flow_to: newTask.assigned_to,
          accentColor: colorToAccentMap[newTask.color],
          due_date: newTask.due_date,
          memo: newTask.memo,
          color: newTask.color,
          assignment_history: [],
        };

        return {
          ...member,
          tasks: [...member.tasks, createdTask],
        };
      }),
    );
  };

  const handleDeleteTask = (taskId: string) => {
    const confirmed = window.confirm("このタスクを削除しますか？");
    if (!confirmed) return;

    setMembers((prevMembers) =>
      prevMembers.map((member) => ({
        ...member,
        tasks: member.tasks.filter((task) => task.task_id !== taskId),
      })),
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleUpdateTask = (updatedTask: UpdateTaskInput) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) => ({
        ...member,
        tasks: member.tasks.map((task) => {
          if (task.task_id !== updatedTask.task_id) return task;

          return {
            ...task,
            task_name: updatedTask.task_name,
            description: updatedTask.description,
            due_date: updatedTask.due_date,
            memo: updatedTask.memo,
            color: updatedTask.color,
            accentColor: colorToAccentMap[updatedTask.color],
            status: updatedTask.status,
            progress_pct: updatedTask.progress_pct,
          };
        }),
      })),
    );

    setEditingTask(null);
  };

  const handleDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };

  const handleDropTaskToMember = (targetMemberName: string) => {
    if (!draggingTaskId) return;

    setMembers((prevMembers) => {
      let foundTask: Task | undefined;
      let sourceMemberName = "";

      const removedFromSource = prevMembers.map((member) => {
        const taskInMember = member.tasks.find(
          (task) => task.task_id === draggingTaskId,
        );

        if (!taskInMember) {
          return member;
        }

        foundTask = taskInMember;
        sourceMemberName = member.member_name;

        return {
          ...member,
          tasks: member.tasks.filter((task) => task.task_id !== draggingTaskId),
        };
      });

      if (!foundTask) return prevMembers;
      if (sourceMemberName === targetMemberName) return prevMembers;

      const updatedTask: Task = {
        ...foundTask,
        assigned_to: targetMemberName,
        flow_from: sourceMemberName,
        flow_to: targetMemberName,
        assignment_history: [
          ...foundTask.assignment_history,
          {
            from: sourceMemberName,
            to: targetMemberName,
            changed_at: new Date().toLocaleString("ja-JP"),
          },
        ],
      };

      return removedFromSource.map((member) => {
        if (member.member_name !== targetMemberName) return member;

        return {
          ...member,
          tasks: [...member.tasks, updatedTask],
        };
      });
    });

    setDraggingTaskId(null);
  };

  return (
    <>
      <div className="space-y-6">
        <DashboardHeader
          selectedRange={selectedRange}
          onChangeRange={setSelectedRange}
          onOpenTaskModal={() => setIsTaskModalOpen(true)}
          filterStatus={filterStatus}
          onChangeStatus={setFilterStatus}
          search={search}
          onChangeSearch={setSearch}
        />

        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4 px-1 pt-1">
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
        </div>
      </div>

      <TaskAddModal
        isOpen={isTaskModalOpen}
        members={members}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleAddTask}
      />

      <TaskEditModal
        isOpen={Boolean(editingTask)}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleUpdateTask}
      />
    </>
  );
}