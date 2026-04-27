import { getSupabaseClient } from "@/lib/supabase/client";
import { getAssigneeNames, normalizeAssigneeCapacities, taskHasAssignee } from "@/lib/dashboard-assignees";
import type {
    AssignmentHistoryItem,
    DashboardStore,
    Member,
    MemberRole,
    Project,
    Task,
    TaskColor,
    TaskPriority,
    TaskStatus,
} from "@/types/dashboard";

type MemberRow = {
    id: string;
    member_code: string | null;
    member_name: string;
    initials: string | null;
    role: string | null;
    column_color: string | null;
    display_order: number | null;
    is_active: boolean | null;
};

type ProjectRow = {
    id: string;
    project_code: string | null;
    project_name: string;
    color: TaskColor;
    accent_color: string;
    display_order: number | null;
    is_active: boolean | null;
};

type TaskRow = {
    id: string;
    task_code: string;
    task_name: string;
    project_name: string;
    priority: TaskPriority;
    status: TaskStatus;
    progress_pct: number;
    manager_name: string;
    leader_name: string;
    assignee_name: string;
    assigned_to: string;
    capacity_pct: number;
    capacity_by_assignee: Record<string, number> | null;
    description: string;
    flow_from: string;
    flow_to: string;
    accent_color: string;
    color: TaskColor;
    due_date: string | null;
    memo: string;
    completed_at: string | null;
    updated_at: string | null;
};

type AssignmentHistoryRow = {
    task_id: string;
    from_member_name: string;
    to_member_name: string;
    assignment_role: AssignmentHistoryItem["role"];
    changed_at: string;
};

function getInitials(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "新";
    return trimmed.slice(0, 1);
}

function normalizeMemberRole(role: string | null): MemberRole {
    if (role === "Lead" || role === "リード" || role === "マネージャー" || role === "リーダー") {
        return "Lead";
    }

    if (role === "正社員") {
        return "正社員";
    }

    return "業務委託";
}

function buildAssignmentHistoryMap(rows: AssignmentHistoryRow[]) {
    const map = new Map<string, AssignmentHistoryItem[]>();

    rows.forEach((row) => {
        const current = map.get(row.task_id) ?? [];
        current.push({
            from: row.from_member_name,
            to: row.to_member_name,
            role: row.assignment_role,
            changed_at: row.changed_at,
        });
        map.set(row.task_id, current);
    });

    return map;
}

function mapProjects(rows: ProjectRow[]): Project[] {
    return rows.map((row) => ({
        project_id: row.project_code || row.id,
        project_name: row.project_name,
        color: row.color,
        accentColor: row.accent_color,
    }));
}

function mapTasks(rows: TaskRow[], historyMap: Map<string, AssignmentHistoryItem[]>): Task[] {
    return rows.map((row) => {
        const assigneeNames = getAssigneeNames(row.assigned_to || row.assignee_name);
        const capacityByAssignee = normalizeAssigneeCapacities(
            assigneeNames,
            row.capacity_by_assignee,
            row.capacity_pct,
        );

        const leadName = row.leader_name || row.manager_name || "";

        return {
            task_id: row.task_code,
            task_name: row.task_name,
            project_name: row.project_name,
            priority: row.priority,
            status: row.status,
            progress_pct: row.progress_pct,
            manager: leadName,
            leader: leadName,
            assignee: row.assignee_name,
            capacity_pct: row.capacity_pct,
            capacity_by_assignee: capacityByAssignee,
            assigned_to: row.assigned_to,
            description: row.description,
            flow_from: row.flow_from,
            flow_to: row.flow_to,
            accentColor: row.accent_color,
            color: row.color,
            due_date: row.due_date ?? "",
            memo: row.memo,
            completed_at: row.completed_at,
            updated_at: row.updated_at,
            assignment_history: historyMap.get(row.id) ?? [],
        };
    });
}

function attachTasksToMembers(memberRows: MemberRow[], tasks: Task[]): Member[] {
    return memberRows.map((row) => {
        const memberTasks = tasks.filter((task) => taskHasAssignee(task, row.member_name));

        const dueTodayCount = memberTasks.filter((task) => {
            if (task.status === "完了" || !task.due_date) return false;
            return task.due_date.slice(0, 10) === new Date().toISOString().slice(0, 10);
        }).length;

        return {
            member_id: row.member_code || row.id,
            member_name: row.member_name,
            role: normalizeMemberRole(row.role),
            initials: row.initials || getInitials(row.member_name),
            capacity_pct: dueTodayCount,
            capacity_label: `${dueTodayCount} 件`,
            due_today_count: dueTodayCount,
            columnColor: row.column_color || "border-slate-400",
            tasks: memberTasks,
        };
    });
}

export async function fetchSupabaseDashboardStore(): Promise<DashboardStore> {
    const supabase = getSupabaseClient();

    const [membersResult, projectsResult, tasksResult, historyResult] = await Promise.all([
        supabase
            .from("members")
            .select("id, member_code, member_name, initials, role, column_color, display_order, is_active")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
        supabase
            .from("projects")
            .select("id, project_code, project_name, color, accent_color, display_order, is_active")
            .eq("is_active", true)
            .order("display_order", { ascending: true }),
        supabase
            .from("tasks")
            .select(
                "id, task_code, task_name, project_name, priority, status, progress_pct, manager_name, leader_name, assignee_name, assigned_to, capacity_pct, capacity_by_assignee, description, flow_from, flow_to, accent_color, color, due_date, memo, completed_at, updated_at",
            )
            .order("created_at", { ascending: true }),
        supabase
            .from("task_assignment_history")
            .select("task_id, from_member_name, to_member_name, assignment_role, changed_at")
            .order("changed_at", { ascending: true }),
    ]);

    if (membersResult.error) {
        throw new Error(`members の取得に失敗しました: ${membersResult.error.message}`);
    }

    if (projectsResult.error) {
        throw new Error(`projects の取得に失敗しました: ${projectsResult.error.message}`);
    }

    if (tasksResult.error) {
        throw new Error(`tasks の取得に失敗しました: ${tasksResult.error.message}`);
    }

    if (historyResult.error) {
        throw new Error(`task_assignment_history の取得に失敗しました: ${historyResult.error.message}`);
    }

    const memberRows = (membersResult.data ?? []) as MemberRow[];
    const projectRows = (projectsResult.data ?? []) as ProjectRow[];
    const taskRows = (tasksResult.data ?? []) as TaskRow[];
    const historyRows = (historyResult.data ?? []) as AssignmentHistoryRow[];

    const historyMap = buildAssignmentHistoryMap(historyRows);
    const tasks = mapTasks(taskRows, historyMap);
    const projects = mapProjects(projectRows);
    const members = attachTasksToMembers(memberRows, tasks);

    return {
        members,
        projects,
    };
}