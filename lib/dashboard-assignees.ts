import type { Task } from "@/types/dashboard";

export function getAssigneeNames(value?: string | null): string[] {
    const seen = new Set<string>();
    return String(value ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => {
            if (!name || seen.has(name)) return false;
            seen.add(name);
            return true;
        });
}

export function joinAssigneeNames(names: string[]): string {
    const seen = new Set<string>();
    return names
        .map((name) => name.trim())
        .filter((name) => {
            if (!name || seen.has(name)) return false;
            seen.add(name);
            return true;
        })
        .join(", ");
}

export function getPrimaryAssigneeName(value?: string | null): string {
    return getAssigneeNames(value)[0] ?? "";
}

export function taskHasAssignee(
    task: { assignee?: string | null; assigned_to?: string | null },
    memberName: string,
): boolean {
    const names = getAssigneeNames(task.assigned_to || task.assignee);
    return names.includes(memberName);
}

export function toggleAssigneeName(currentNames: string[], memberName: string): string[] {
    if (currentNames.includes(memberName)) {
        return currentNames.filter((name) => name !== memberName);
    }
    return [...currentNames, memberName];
}

export function toNumberCapacity(value: unknown): number {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return 0;
    return Math.max(0, Math.min(100, Math.round(numberValue)));
}

export function normalizeAssigneeCapacities(
    assigneeNames: string[],
    current: Record<string, number> | null | undefined,
    fallbackCapacityPct = 0,
): Record<string, number> {
    const next: Record<string, number> = {};
    const fallback = toNumberCapacity(fallbackCapacityPct);

    assigneeNames.forEach((name) => {
        next[name] = toNumberCapacity(current?.[name] ?? fallback);
    });

    return next;
}

export function getCapacityForMember(task: Pick<Task, "capacity_pct" | "capacity_by_assignee">, memberName: string): number {
    if (task.capacity_by_assignee && Object.prototype.hasOwnProperty.call(task.capacity_by_assignee, memberName)) {
        return toNumberCapacity(task.capacity_by_assignee[memberName]);
    }

    return toNumberCapacity(task.capacity_pct);
}

export function getPrimaryCapacityPct(
    assigneeNames: string[],
    capacityByAssignee: Record<string, number>,
): number {
    const first = assigneeNames[0];
    if (!first) return 0;
    return getCapacityForMember({ capacity_pct: 0, capacity_by_assignee: capacityByAssignee } as Task, first);
}

export function replaceAssigneeName(currentNames: string[], sourceMemberName: string, targetMemberName: string): string[] {
    const nextNames = currentNames.map((name) => (name === sourceMemberName ? targetMemberName : name));
    return getAssigneeNames(joinAssigneeNames(nextNames));
}

export function moveAssigneeCapacity(
    current: Record<string, number> | null | undefined,
    sourceMemberName: string,
    targetMemberName: string,
    fallbackCapacityPct = 0,
): Record<string, number> {
    const next: Record<string, number> = { ...(current ?? {}) };
    const movedCapacity = toNumberCapacity(next[sourceMemberName] ?? fallbackCapacityPct);
    delete next[sourceMemberName];
    next[targetMemberName] = movedCapacity;
    return next;
}
