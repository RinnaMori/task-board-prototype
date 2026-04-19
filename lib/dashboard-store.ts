"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultStore } from "@/data/mock-data";
import type {
    AssignmentHistoryItem,
    DashboardStore,
    FlowRow,
    Member,
    MemberStatusSummary,
    Project,
    Task,
    TaskColor,
    TaskStatus,
} from "@/types/dashboard";

const STORAGE_KEY = "task-dashboard-store-v2";

export const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "完了", "保留"];

export const PRIORITY_OPTIONS = ["高", "中", "低"] as const;

export const TASK_COLOR_ACCENTS: Record<TaskColor, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
    cyan: "bg-cyan-500",
    slate: "bg-slate-500",
};

export const PROJECT_COLOR_MAP: Record<string, { color: TaskColor; accentColor: string }> = {
    Webサイト更新: { color: "blue", accentColor: "bg-blue-500" },
    競合調査: { color: "green", accentColor: "bg-green-500" },
    営業支援: { color: "orange", accentColor: "bg-orange-500" },
    データ整備: { color: "cyan", accentColor: "bg-cyan-500" },
    その他: { color: "slate", accentColor: "bg-slate-500" },
};

function cloneDefaultStore(): DashboardStore {
    return JSON.parse(JSON.stringify(defaultStore)) as DashboardStore;
}

export function formatNow() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
        now.getHours(),
    )}:${pad(now.getMinutes())}`;
}

export function getProjectColor(
    projectName: string,
    projects: Project[],
): { color: TaskColor; accentColor: string } {
    const fromProjects = projects.find((project) => project.project_name === projectName);
    if (fromProjects) {
        return {
            color: fromProjects.color,
            accentColor: fromProjects.accentColor,
        };
    }

    return PROJECT_COLOR_MAP[projectName] ?? PROJECT_COLOR_MAP["その他"];
}

export function getInitials(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "新";
    return trimmed.slice(0, 1);
}

export function isOverdue(task: Task) {
    if (!task.due_date || task.status === "完了") return false;
    const today = new Date();
    const due = new Date(task.due_date);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
}

export function getDueLabel(dueDate: string) {
    return dueDate || "未設定";
}

export function getDueTextClass(task: Task) {
    if (!task.due_date) return "text-slate-400";
    if (task.status === "完了") return "text-slate-500";
    if (isOverdue(task)) return "text-red-600";

    const today = new Date();
    const due = new Date(task.due_date);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 3) return "text-amber-600";
    return "text-slate-500";
}

export function getAllTasks(members: Member[]) {
    return members
        .flatMap((member) => member.tasks)
        .sort((a, b) => a.task_id.localeCompare(b.task_id, "ja"));
}

export function getMemberCapacity(member: Member) {
    return member.tasks
        .filter((task) => task.status === "進行中")
        .reduce((sum, task) => sum + task.capacity_pct, 0);
}

export function getMemberStatusSummary(member: Member): MemberStatusSummary {
    const summary = {
        member_name: member.member_name,
        未着手: 0,
        進行中: 0,
        完了: 0,
        保留: 0,
        合計: member.tasks.length,
    } satisfies MemberStatusSummary;

    member.tasks.forEach((task) => {
        summary[task.status] += 1;
    });

    return summary;
}

export function getFlowRows(tasks: Task[]): FlowRow[] {
    return tasks.map((task) => {
        const latestHistory = task.assignment_history[task.assignment_history.length - 1];

        return {
            task_id: task.task_id,
            task_name: task.task_name,
            manager: task.manager,
            leader: task.leader,
            assignee: task.assignee,
            latest_flow: latestHistory
                ? `${latestHistory.from} → ${latestHistory.to}`
                : `${task.flow_from} → ${task.flow_to}`,
            delegated_at: latestHistory?.changed_at ?? "-",
            status: task.status,
        };
    });
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

function normalizeStore(input: DashboardStore): DashboardStore {
    return {
        members: input.members.map((member) => ({
            ...member,
            initials: member.initials || getInitials(member.member_name),
            tasks: member.tasks.map((task) => ({
                ...task,
                priority: task.priority ?? "中",
                assignment_history: task.assignment_history.map((item) => ({
                    ...item,
                    role: item.role ?? "担当変更",
                })),
            })),
        })),
        projects: input.projects,
    };
}

export function loadDashboardStore(): DashboardStore {
    if (typeof window === "undefined") return cloneDefaultStore();

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneDefaultStore();

    try {
        return normalizeStore(JSON.parse(saved) as DashboardStore);
    } catch {
        return cloneDefaultStore();
    }
}

export function saveDashboardStore(store: DashboardStore) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function decorateMembers(members: Member[]) {
    return members.map((member) => {
        const capacity = getMemberCapacity(member);
        return {
            ...member,
            initials: member.initials || getInitials(member.member_name),
            capacity_pct: capacity,
            capacity_label: `${capacity} / 100`,
        };
    });
}

export function useDashboardStore() {
    const [store, setStore] = useState<DashboardStore>(cloneDefaultStore());
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setStore(loadDashboardStore());
        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!isReady) return;
        saveDashboardStore(store);
    }, [isReady, store]);

    const decoratedMembers = useMemo(() => decorateMembers(store.members), [store.members]);
    const tasks = useMemo(() => getAllTasks(decoratedMembers), [decoratedMembers]);
    const flowRows = useMemo(() => getFlowRows(tasks), [tasks]);
    const statusSummary = useMemo(
        () => decoratedMembers.map((member) => getMemberStatusSummary(member)),
        [decoratedMembers],
    );

    return {
        isReady,
        members: decoratedMembers,
        rawMembers: store.members,
        projects: store.projects,
        tasks,
        flowRows,
        statusSummary,
        setMembers: (members: Member[]) => setStore((prev) => ({ ...prev, members })),
        setProjects: (projects: Project[]) => setStore((prev) => ({ ...prev, projects })),
        resetStore: () => setStore(cloneDefaultStore()),
    };
}