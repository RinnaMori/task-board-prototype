"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchSupabaseDashboardStore } from "@/lib/supabase/dashboard-reader";
import {
    getAssigneeNames,
    getCapacityForMember,
    getPrimaryAssigneeName,
    normalizeAssigneeCapacities,
} from "@/lib/dashboard-assignees";
import { getSupabaseClient } from "@/lib/supabase/client";
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

const STORE_EVENT_NAME = "dashboard-store-updated";

const EMPTY_STORE: DashboardStore = {
    members: [],
    projects: [],
};

export const PRIORITY_OPTIONS: TaskPriority[] = ["高", "中", "低"];
export const STATUS_OPTIONS: TaskStatus[] = ["未着手", "進行中", "完了", "保留"];
export const ROLE_OPTIONS: MemberRole[] = ["Lead", "正社員", "業務委託"];

export function cloneDefaultStore(): DashboardStore {
    return {
        members: [],
        projects: [],
    };
}

export function inferRoleFromName(name: string): MemberRole {
    if (
        name.includes("Lead") ||
        name.includes("リード") ||
        name.includes("マネージャー") ||
        name.includes("リーダー")
    ) {
        return "Lead";
    }
    if (name.includes("正社員")) return "正社員";
    return "業務委託";
}

export function getRoleOrder(role: MemberRole) {
    return ROLE_OPTIONS.indexOf(role);
}

function getMemberRole(member: Member): MemberRole {
    return member.role || inferRoleFromName(member.member_name);
}

function getMemberActiveTaskCount(member: Member) {
    return member.tasks.filter((task) => task.status !== "完了").length;
}

function sortMembersForDashboard(members: Member[]) {
    return [...members].sort((a, b) => {
        const roleDiff = getRoleOrder(getMemberRole(a)) - getRoleOrder(getMemberRole(b));
        if (roleDiff !== 0) return roleDiff;

        const taskCountDiff = getMemberActiveTaskCount(b) - getMemberActiveTaskCount(a);
        if (taskCountDiff !== 0) return taskCountDiff;

        return a.member_name.localeCompare(b.member_name, "ja");
    });
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
    const primaryAssignee = getPrimaryAssigneeName(task.assignee);
    const leadName = task.leader || task.manager;

    if (leadName && primaryAssignee && leadName !== primaryAssignee) {
        history.push({
            from: leadName,
            to: primaryAssignee,
            role: "Lead→担当者",
            changed_at: now,
        });
    } else if (!leadName && primaryAssignee) {
        history.push({
            from: "未設定",
            to: primaryAssignee,
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
    const map = new Map<string, Task>();
    members.flatMap((member) => member.tasks).forEach((task) => {
        if (!map.has(task.task_id)) {
            map.set(task.task_id, task);
        }
    });
    return Array.from(map.values());
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
        role: getMemberRole(member),
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
            role: getMemberRole(member),
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
            role: getMemberRole(member),
            initials: member.initials || getInitials(member.member_name),
            due_today_count: member.due_today_count ?? 0,
            tasks: member.tasks.map((task) => ({
                ...task,
                completed_at: task.completed_at ?? null,
                capacity_by_assignee: normalizeAssigneeCapacities(
                    getAssigneeNames(task.assigned_to || task.assignee),
                    task.capacity_by_assignee,
                    task.capacity_pct,
                ),
                assignment_history: task.assignment_history ?? [],
            })),
        })),
        projects: input.projects,
    };
}

export function loadDashboardStore(): DashboardStore {
    return cloneDefaultStore();
}

export function saveDashboardStore() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(STORE_EVENT_NAME));
}

export function useDashboardStore() {
    const [store, setStore] = useState<DashboardStore>(EMPTY_STORE);

    useEffect(() => {
        let active = true;

        const syncFromSupabase = async () => {
            try {
                const remoteStore = await fetchSupabaseDashboardStore();
                if (!active) return;

                setStore(normalizeStore(remoteStore));
            } catch (error) {
                console.error("Supabase 読み込み失敗", error);
            }
        };

        const handleDashboardUpdated = () => {
            void syncFromSupabase();
        };

        const handleFocus = () => {
            void syncFromSupabase();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void syncFromSupabase();
            }
        };

        const supabase = getSupabaseClient();

        const channel = supabase
            .channel("dashboard-realtime")
            .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
                void syncFromSupabase();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
                void syncFromSupabase();
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
                void syncFromSupabase();
            })
            .subscribe();

        void syncFromSupabase();

        window.addEventListener(STORE_EVENT_NAME, handleDashboardUpdated);
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            active = false;
            supabase.removeChannel(channel);
            window.removeEventListener(STORE_EVENT_NAME, handleDashboardUpdated);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    const members = useMemo(() => sortMembersForDashboard(decorateMembers(store.members)), [store.members]);
    const tasks = useMemo(() => getAllTasks(members), [members]);
    const activeTasks = useMemo(() => getActiveTasks(members), [members]);
    const completedTasks = useMemo(() => getCompletedTasks(members), [members]);
    const dashboardTasks = useMemo(() => getDashboardVisibleTasks(members), [members]);
    const statusSummary = useMemo(() => members.map((member) => getMemberStatusSummary(member)), [members]);

    const updateStore = (getNextStore: (currentStore: DashboardStore) => DashboardStore) => {
        setStore((currentStore) => normalizeStore(getNextStore(currentStore)));
        saveDashboardStore();
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
            updateStore((currentStore) => ({
                ...currentStore,
                members: membersToSave,
            }));
        },
        setProjects: (projectsToSave: Project[]) => {
            updateStore((currentStore) => ({
                ...currentStore,
                projects: projectsToSave,
            }));
        },
    };
}

export function buildAssignmentMatrix(tasks: Task[]): AssignmentMatrixRow[] {
    const uniqueTasks = getAllTasks([
        {
            member_id: "_all",
            member_name: "_all",
            role: "業務委託",
            initials: "",
            capacity_pct: 0,
            capacity_label: "",
            due_today_count: 0,
            columnColor: "",
            tasks,
        },
    ]);
    const counts = new Map<string, number>();

    uniqueTasks
        .filter((task) => task.status !== "完了")
        .forEach((task) => {
            const latest = task.assignment_history[task.assignment_history.length - 1];
            const from = latest?.from || task.leader || task.manager || task.flow_from || "未設定";
            const assignees = getAssigneeNames(task.assigned_to || task.assignee);
            const targets = assignees.length > 0 ? assignees : [latest?.to || task.flow_to || "未設定"];

            targets.forEach((to) => {
                const key = `${from}__${to}`;
                counts.set(key, (counts.get(key) ?? 0) + 1);
            });
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
    const uniqueTasks = getAllTasks([
        {
            member_id: "_all",
            member_name: "_all",
            role: "業務委託",
            initials: "",
            capacity_pct: 0,
            capacity_label: "",
            due_today_count: 0,
            columnColor: "",
            tasks,
        },
    ]);

    return uniqueTasks.map((task) => {
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
    const uniqueTaskMap = new Map<string, Task>();

    tasks.forEach((task) => {
        if (!uniqueTaskMap.has(task.task_id)) {
            uniqueTaskMap.set(task.task_id, task);
        }
    });

    const uniqueLogMap = new Map<string, FlowLogRow>();

    Array.from(uniqueTaskMap.values()).forEach((task) => {
        task.assignment_history.forEach((history) => {
            const logKey = [
                task.task_id,
                history.changed_at,
                history.from,
                history.to,
                history.role,
            ].join("__");

            if (uniqueLogMap.has(logKey)) {
                return;
            }

            uniqueLogMap.set(logKey, {
                log_id: logKey,
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
            });
        });
    });

    return Array.from(uniqueLogMap.values()).sort(
        (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
    );
}