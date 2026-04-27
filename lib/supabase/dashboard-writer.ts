import { getSupabaseClient } from "@/lib/supabase/client";
import { getAssigneeNames, getPrimaryCapacityPct, joinAssigneeNames, moveAssigneeCapacity, normalizeAssigneeCapacities, replaceAssigneeName } from "@/lib/dashboard-assignees";
import type { AssignmentHistoryItem, TaskColor, TaskPriority, TaskStatus } from "@/types/dashboard";

type TaskInsertInput = {
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
    capacity_by_assignee: Record<string, number>;
    description: string;
    flow_from: string;
    flow_to: string;
    accent_color: string;
    color: TaskColor;
    due_date: string | null;
    memo: string;
    completed_at: string | null;
};

type TaskUpdateInput = Partial<Omit<TaskInsertInput, "task_code">>;

type TaskUpdateOptions = {
    expectedUpdatedAt?: string | null;
};

type MemberInsertInput = {
    member_code: string;
    member_name: string;
    initials: string;
    role: string;
    column_color: string;
    display_order: number;
    is_active: boolean;
};

type ProjectInsertInput = {
    project_code: string;
    project_name: string;
    color: TaskColor;
    accent_color: string;
    is_active: boolean;
};

export async function getNextMemberCodeFromSupabase() {
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

export async function findLatestTaskRowIdByTaskCode(taskCode: string): Promise<{ id: string; updated_at: string | null } | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("tasks")
        .select("id, updated_at")
        .eq("task_code", taskCode)
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(error.message);
    }

    return data && data.length > 0 ? { id: data[0].id as string, updated_at: data[0].updated_at as string | null } : null;
}

export async function findMemberRowId(memberId: string, memberName: string): Promise<string | null> {
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

export function toHistoryInsertRows(taskDbId: string, history: AssignmentHistoryItem[]) {
    return history.map((item) => ({
        task_id: taskDbId,
        from_member_name: item.from,
        to_member_name: item.to,
        assignment_role: item.role,
        changed_at: item.changed_at,
    }));
}

export async function insertDashboardTask(input: TaskInsertInput) {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("tasks")
        .insert(input)
        .select("id, updated_at")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as { id: string; updated_at: string | null };
}

export async function insertTaskAssignmentHistory(taskDbId: string, history: AssignmentHistoryItem[]) {
    if (history.length === 0) return;

    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from("task_assignment_history")
        .insert(toHistoryInsertRows(taskDbId, history));

    if (error) {
        throw new Error(error.message);
    }
}

export async function updateDashboardTaskByCode(
    taskCode: string,
    updates: TaskUpdateInput,
    options: TaskUpdateOptions = {},
) {
    const taskRow = await findLatestTaskRowIdByTaskCode(taskCode);

    if (!taskRow) {
        throw new Error("対象タスクが見つかりません");
    }

    const supabase = getSupabaseClient();

    if (options.expectedUpdatedAt) {
        const { data: currentTask, error: currentTaskError } = await supabase
            .from("tasks")
            .select("updated_at")
            .eq("id", taskRow.id)
            .single();

        if (currentTaskError) {
            throw new Error(currentTaskError.message);
        }

        if (currentTask?.updated_at && currentTask.updated_at !== options.expectedUpdatedAt) {
            throw new Error(
                "他のユーザーが先にこのタスクを更新しました。画面を更新してからもう一度操作してください。",
            );
        }
    }

    const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskRow.id)
        .select("id, updated_at")
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return data as { id: string; updated_at: string | null };
}

export async function completeDashboardTask(
    taskCode: string,
    completedAt: string,
    options: TaskUpdateOptions = {},
) {
    return updateDashboardTaskByCode(
        taskCode,
        {
            status: "完了",
            progress_pct: 100,
            completed_at: completedAt,
        },
        options,
    );
}

export async function deleteDashboardTask(taskCode: string) {
    const taskRow = await findLatestTaskRowIdByTaskCode(taskCode);

    if (!taskRow) {
        throw new Error("対象タスクが見つかりません");
    }

    const supabase = getSupabaseClient();

    const { error: historyDeleteError } = await supabase
        .from("task_assignment_history")
        .delete()
        .eq("task_id", taskRow.id);

    if (historyDeleteError) {
        throw new Error(historyDeleteError.message);
    }

    const { error: taskDeleteError } = await supabase.from("tasks").delete().eq("id", taskRow.id);

    if (taskDeleteError) {
        throw new Error(taskDeleteError.message);
    }
}

export async function insertSingleTaskAssignmentHistory(input: {
    taskDbId: string;
    from_member_name: string;
    to_member_name: string;
    assignment_role: string;
    changed_at: string;
}) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("task_assignment_history").insert({
        task_id: input.taskDbId,
        from_member_name: input.from_member_name,
        to_member_name: input.to_member_name,
        assignment_role: input.assignment_role,
        changed_at: input.changed_at,
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function updateDashboardTaskAssignee(input: {
    taskCode: string;
    sourceMemberName: string;
    targetMemberName: string;
    changedAt: string;
    expectedUpdatedAt?: string | null;
}) {
    const supabase = getSupabaseClient();

    const latest = await findLatestTaskRowIdByTaskCode(input.taskCode);

    if (!latest) {
        throw new Error("対象タスクが見つかりません");
    }

    if (input.expectedUpdatedAt && latest.updated_at && latest.updated_at !== input.expectedUpdatedAt) {
        throw new Error("他のユーザーが先にこのタスクを更新しました。画面を再読み込みしてから再度お試しください。");
    }

    const { data: currentTask, error: currentTaskError } = await supabase
        .from("tasks")
        .select("assignee_name, assigned_to, capacity_pct, capacity_by_assignee")
        .eq("id", latest.id)
        .single();

    if (currentTaskError) {
        throw new Error(currentTaskError.message);
    }

    const currentNames = getAssigneeNames(
        String(currentTask?.assigned_to || currentTask?.assignee_name || ""),
    );

    if (!currentNames.includes(input.sourceMemberName) && currentNames.includes(input.targetMemberName)) {
        return;
    }

    const nextNames = replaceAssigneeName(currentNames, input.sourceMemberName, input.targetMemberName);
    const nextAssignedTo = joinAssigneeNames(nextNames);
    const movedCapacities = moveAssigneeCapacity(
        (currentTask?.capacity_by_assignee as Record<string, number> | null) ?? null,
        input.sourceMemberName,
        input.targetMemberName,
        Number(currentTask?.capacity_pct ?? 0),
    );
    const nextCapacityByAssignee = normalizeAssigneeCapacities(nextNames, movedCapacities, Number(currentTask?.capacity_pct ?? 0));

    const taskRow = await updateDashboardTaskByCode(
        input.taskCode,
        {
            assignee_name: nextAssignedTo,
            assigned_to: nextAssignedTo,
            capacity_pct: getPrimaryCapacityPct(nextNames, nextCapacityByAssignee),
            capacity_by_assignee: nextCapacityByAssignee,
            flow_from: input.sourceMemberName,
            flow_to: input.targetMemberName,
        },
        { expectedUpdatedAt: input.expectedUpdatedAt },
    );

    await insertSingleTaskAssignmentHistory({
        taskDbId: taskRow.id,
        from_member_name: input.sourceMemberName,
        to_member_name: input.targetMemberName,
        assignment_role: "担当変更",
        changed_at: input.changedAt,
    });
}

export async function insertDashboardMember(input: MemberInsertInput) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("members").insert(input);

    if (error) {
        throw new Error(error.message);
    }
}

export async function deactivateDashboardMember(memberId: string, memberName: string) {
    const memberRowId = await findMemberRowId(memberId, memberName);

    if (!memberRowId) return;

    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from("members")
        .update({ is_active: false })
        .eq("id", memberRowId);

    if (error) {
        throw new Error(error.message);
    }
}

export async function deleteSchedulesByMemberName(memberName: string) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("schedules").delete().eq("member_name", memberName);

    if (error) {
        throw new Error(error.message);
    }
}

export async function deleteTasksAndHistoriesByTaskCodes(taskCodes: string[]) {
    if (taskCodes.length === 0) return;

    const supabase = getSupabaseClient();

    const { data: taskRows, error: taskRowsError } = await supabase
        .from("tasks")
        .select("id")
        .in("task_code", taskCodes);

    if (taskRowsError) {
        throw new Error(taskRowsError.message);
    }

    const taskIds = (taskRows ?? []).map((row) => row.id as string);

    if (taskIds.length === 0) return;

    const { error: historyDeleteError } = await supabase
        .from("task_assignment_history")
        .delete()
        .in("task_id", taskIds);

    if (historyDeleteError) {
        throw new Error(historyDeleteError.message);
    }

    const { error: taskDeleteError } = await supabase.from("tasks").delete().in("id", taskIds);

    if (taskDeleteError) {
        throw new Error(taskDeleteError.message);
    }
}


export async function removeMemberFromDashboardTaskAssignees(memberName: string) {
    const supabase = getSupabaseClient();

    const { data: taskRows, error } = await supabase
        .from("tasks")
        .select("id, assignee_name, assigned_to, capacity_pct, capacity_by_assignee")
        .or(`assignee_name.ilike.%${memberName}%,assigned_to.ilike.%${memberName}%`);

    if (error) {
        throw new Error(error.message);
    }

    const updates = (taskRows ?? [])
        .map((row) => {
            const currentNames = getAssigneeNames(
                String(row.assigned_to || row.assignee_name || ""),
            );
            const nextNames = currentNames.filter((name) => name !== memberName);

            const nextCapacityByAssignee = normalizeAssigneeCapacities(
                nextNames,
                row.capacity_by_assignee as Record<string, number> | null,
                Number(row.capacity_pct ?? 0),
            );

            return {
                id: row.id as string,
                nextNames,
                nextAssignedTo: joinAssigneeNames(nextNames),
                nextCapacityByAssignee,
                shouldUpdate: currentNames.length > 1 && nextNames.length > 0,
            };
        })
        .filter((row) => row.shouldUpdate);

    for (const row of updates) {
        const { error: updateError } = await supabase
            .from("tasks")
            .update({
                assignee_name: row.nextAssignedTo,
                assigned_to: row.nextAssignedTo,
                capacity_pct: getPrimaryCapacityPct(row.nextNames, row.nextCapacityByAssignee),
                capacity_by_assignee: row.nextCapacityByAssignee,
            })
            .eq("id", row.id);

        if (updateError) {
            throw new Error(updateError.message);
        }
    }
}

export async function deleteDashboardMemberWithRelatedData(input: {
    memberId: string;
    memberName: string;
    taskCodes: string[];
}) {
    await deleteTasksAndHistoriesByTaskCodes(input.taskCodes);
    await deleteSchedulesByMemberName(input.memberName);
    await deactivateDashboardMember(input.memberId, input.memberName);
}

export async function insertDashboardProject(input: ProjectInsertInput) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("projects").insert(input);

    if (error) {
        throw new Error(error.message);
    }
}

export async function getNextTaskCodeFromSupabase() {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.from("tasks").select("task_code");

    if (error) {
        throw new Error(error.message);
    }

    const maxNumber = (data ?? [])
        .map((row) => Number(String(row.task_code ?? "").replace(/[^0-9]/g, "")) || 0)
        .reduce((max, current) => Math.max(max, current), 0);

    return `T-${String(maxNumber + 1).padStart(3, "0")}`;
}

export async function getNextProjectCodeFromSupabase() {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.from("projects").select("project_code");

    if (error) {
        throw new Error(error.message);
    }

    const maxNumber = (data ?? [])
        .map((row) => Number(String(row.project_code ?? "").replace(/[^0-9]/g, "")) || 0)
        .reduce((max, current) => Math.max(max, current), 0);

    return `P-${String(maxNumber + 1).padStart(3, "0")}`;
}