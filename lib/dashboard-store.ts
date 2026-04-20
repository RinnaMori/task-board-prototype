"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultStore } from "@/data/mock-data";
import type {
    AssignmentHistoryItem,
    AssignmentMatrixRow,
    DashboardStore,
    FlowLogRow,
    FlowTableRow,
    Member,
    MemberRole,
    MemberStatusSummary,
    Project,
    Task,
    TaskPriority,
    TaskStatus,
} from "@/types/dashboard";

const STORAGE_KEY = "task-dashboard-store-v3";
const STORE_EVENT_NAME = "dashboard-store-updated";

export const PRIORITY_OPTIONS: TaskPriority[] = ["高", "中", "低"];
export const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "完了", "保留"];
export const ROLE_OPTIONS: MemberRole[] = ["マネージャー", "リーダー", "正社員", "業務委託"];

export function cloneDefaultStore(): DashboardStore {
    return JSON.parse(JSON.stringify(defaultStore)) as DashboardStore;
}

export function inferRoleFromName(name: string): MemberRole {
    if (name.includes("マネージャー")) return "マネージャー";
    if (name.includes("リーダー")) return "リーダー";
    if (name.includes("正社員")) return "正社員";
    return "業務委託";
}

export function getRoleOrder(role: MemberRole) {
    return ROLE_OPTIONS.indexOf(role);
}

export function formatNow() {
    return new Date().toISOString();
}

export function formatDateTimeLabel(value?: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(
        date.getDate(),
    ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
    ).padStart(2, "0")}`;
}

export function getInitials(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "新";
    return trimmed.slice(0, 1);
}

export function normalizeDate(value: string) {
    return value ? value.slice(0, 10) : "";
}

export function isDueToday(task: Task) {
    if (!task.due_date) return false;
    return normalizeDate(task.due_date) === normalizeDate(new Date().toISOString());
}

export function isOverdue(task: Task) {
    if (!task.due_date || task.status === "完了") return false;
    const today = normalizeDate(new Date().toISOString());
    return normalizeDate(task.due_date) < today;
}

export function getDueLabel(dueDate: string) {
    return dueDate || "未設定";
}

export function getDueTextClass(task: Task) {
    if (!task.due_date) return "text-slate-400";
    if (task.status === "完了") return "text-slate-500";
    if (isOverdue(task)) return "text-red-600";
    if (isDueToday(task)) return "text-amber-600";
    return "text-slate-500";
}

export function createInitialAssignmentHistory(task: {
    manager: string;
    leader: string;
    assignee: string;
}): AssignmentHistoryItem[] {
    const now = formatNow();
    const history: AssignmentHistoryItem[] = [];

    if (task.manager && task.leader && task.manager !== task.leader) {
        history.push({
            from: task.manager,
            to: task.leader,
            role: "Manager→Leader",
            changed_at: now,
        });
    }

    if (task.leader && task.assignee && task.leader !== task.assignee) {
        history.push({
            from: task.leader,
            to: task.assignee,
            role: "Leader→担当者",
            changed_at: now,
        });
    } else if (task.manager && task.assignee && task.manager !== task.assignee && history.length === 0) {
        history.push({
            from: task.manager,
            to: task.assignee,
            role: "直接差配",
            changed_at: now,
        });
    }

    return history;
}

export function getProjectColor(
    projectName: string,
    projects: Project[],
): { color: Project["color"]; accentColor: string } {
    const matched = projects.find((project) => project.project_name === projectName);
    return matched
        ? { color: matched.color, accentColor: matched.accentColor }
        : { color: "slate", accentColor: "bg-slate-500" };
}

export function isTaskRecentlyCompleted(task: Task) {
    if (task.status !== "完了" || !task.completed_at) return false;
    const completed = new Date(task.completed_at).getTime();
    if (Number.isNaN(completed)) return false;
    return Date.now() - completed <= 24 * 60 * 60 * 1000;
}

export function shouldShowTaskOnDashboard(task: Task) {
    if (task.status !== "完了") return true;
    return isTaskRecentlyCompleted(task);
}

export function sortTasksForDashboard(tasks: Task[]) {
    const priorityOrder: Record<Task["priority"], number> = {
        高: 0,
        中: 1,
        低: 2,
    };

    return [...tasks].sort((a, b) => {
        const aCompleted = a.status === "完了";
        const bCompleted = b.status === "完了";

        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;

        if (aCompleted && bCompleted) {
            const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            return bTime - aTime;
        }

        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        const aDue = a.due_date || "9999-12-31";
        const bDue = b.due_date || "9999-12-31";
        if (aDue !== bDue) return aDue.localeCompare(bDue);

        return a.task_id.localeCompare(b.task_id, "ja");
    });
}

export function getAllTasks(members: Member[]) {
    return members.flatMap((member) => member.tasks);
}

export function getDashboardVisibleTasks(members: Member[]) {
    return getAllTasks(members).filter(shouldShowTaskOnDashboard);
}

export function getCompletedTasks(members: Member[]) {
    return getAllTasks(members).filter((task) => task.status === "完了");
}

export function getActiveTasks(members: Member[]) {
    return getAllTasks(members).filter((task) => task.status !== "完了");
}

export function getMemberDueTodayCount(member: Member) {
    return member.tasks.filter((task) => task.status !== "完了" && isDueToday(task)).length;
}

export function getMemberStatusSummary(member: Member): MemberStatusSummary {
    const summary: MemberStatusSummary = {
        member_name: member.member_name,
        未着手: 0,
        進行中: 0,
        完了: 0,
        保留: 0,
        合計: member.tasks.length,
    };

    member.tasks.forEach((task) => {
        summary[task.status] += 1;
    });

    return summary;
}

export function decorateMembers(members: Member[]) {
    return members.map((member) => {
        const dueTodayCount = getMemberDueTodayCount(member);
        return {
            ...member,
            initials: member.initials || getInitials(member.member_name),
            due_today_count: dueTodayCount,
            capacity_pct: dueTodayCount,
            capacity_label: `${dueTodayCount} 件`,
        };
    });
}

export function normalizeStore(input: DashboardStore): DashboardStore {
    return {
        members: input.members.map((member) => ({
            ...member,
            initials: member.initials || getInitials(member.member_name),
            due_today_count: member.due_today_count ?? 0,
            tasks: member.tasks.map((task) => ({
                ...task,
                completed_at: task.completed_at ?? null,
                assignment_history: task.assignment_history ?? [],
            })),
        })),
        projects: input.projects,
    };
}

export function loadDashboardStore(): DashboardStore {
    if (typeof window === "undefined") return cloneDefaultStore();

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultStore();

    try {
        return normalizeStore(JSON.parse(raw) as DashboardStore);
    } catch {
        return cloneDefaultStore();
    }
}

export function saveDashboardStore(store: DashboardStore) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(STORE_EVENT_NAME));
}

export function useDashboardStore() {
    const [store, setStore] = useState<DashboardStore>(() => loadDashboardStore());

    useEffect(() => {
        const sync = () => {
            setStore(loadDashboardStore());
        };

        window.addEventListener("storage", sync);
        window.addEventListener(STORE_EVENT_NAME, sync as EventListener);

        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener(STORE_EVENT_NAME, sync as EventListener);
        };
    }, []);

    const members = useMemo(() => decorateMembers(store.members), [store.members]);
    const tasks = useMemo(() => getAllTasks(members), [members]);
    const activeTasks = useMemo(() => getActiveTasks(members), [members]);
    const completedTasks = useMemo(() => getCompletedTasks(members), [members]);
    const dashboardTasks = useMemo(() => getDashboardVisibleTasks(members), [members]);
    const statusSummary = useMemo(() => members.map((member) => getMemberStatusSummary(member)), [members]);

    const updateStore = (nextStore: DashboardStore) => {
        const normalized = normalizeStore(nextStore);
        setStore(normalized);
        saveDashboardStore(normalized);
    };

    return {
        members,
        rawMembers: store.members,
        projects: store.projects,
        tasks,
        activeTasks,
        completedTasks,
        dashboardTasks,
        statusSummary,
        setMembers: (membersToSave: Member[]) => {
            updateStore({
                ...store,
                members: membersToSave,
            });
        },
        setProjects: (projectsToSave: Project[]) => {
            updateStore({
                ...store,
                projects: projectsToSave,
            });
        },
        resetStore: () => {
            updateStore(cloneDefaultStore());
        },
    };
}

export function buildAssignmentMatrix(tasks: Task[]): AssignmentMatrixRow[] {
    const counts = new Map<string, number>();

    tasks
        .filter((task) => task.status !== "完了")
        .forEach((task) => {
            const latest = task.assignment_history[task.assignment_history.length - 1];
            const from = latest?.from || task.manager || task.flow_from || "未設定";
            const to = task.assignee || latest?.to || task.flow_to || "未設定";
            const key = `${from}__${to}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });

    return Array.from(counts.entries())
        .map(([key, count]) => {
            const [from, to] = key.split("__");
            return { from, to, count };
        })
        .sort((a, b) => {
            if (a.from !== b.from) return a.from.localeCompare(b.from, "ja");
            return a.to.localeCompare(b.to, "ja");
        });
}

export function buildFlowRows(tasks: Task[]): FlowTableRow[] {
    return tasks.map((task) => {
        const currentFrom =
            task.assignment_history[task.assignment_history.length - 1]?.from ||
            task.leader ||
            task.manager ||
            task.flow_from ||
            "未設定";

        return {
            task_id: task.task_id,
            task_name: task.task_name,
            manager: task.manager || "未設定",
            leader: task.leader || "未設定",
            assignee: task.assignee || "未設定",
            current_from: currentFrom,
            current_to: task.assignee || task.flow_to || "未設定",
            status: task.status,
            due_date: task.due_date,
            completed_at: task.completed_at ?? null,
        };
    });
}

export function buildFlowLogRows(tasks: Task[]): FlowLogRow[] {
    return tasks
        .flatMap((task) =>
            task.assignment_history.map((history, index) => ({
                log_id: `${task.task_id}-${index}-${history.changed_at}`,
                changed_at: history.changed_at,
                task_id: task.task_id,
                task_name: task.task_name,
                from: history.from,
                to: history.to,
                role: history.role,
                manager: task.manager || "未設定",
                leader: task.leader || "未設定",
                assignee: task.assignee || "未設定",
                status: task.status,
            })),
        )
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
}