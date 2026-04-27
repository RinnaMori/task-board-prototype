"use client";

import { useEffect, useMemo, useState } from "react";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/dashboard-store";
import { getAssigneeNames, joinAssigneeNames, toNumberCapacity, toggleAssigneeName } from "@/lib/dashboard-assignees";
import type {
    Member,
    Project,
    Task,
    TaskPriority,
    TaskStatus,
    UpdateTaskInput,
} from "@/types/dashboard";

type TaskEditModalProps = {
    isOpen: boolean;
    task: Task | null;
    members: Member[];
    projects: Project[];
    onClose: () => void;
    onSubmit: (input: UpdateTaskInput) => void;
};

type TaskEditForm = Omit<UpdateTaskInput, "capacity_pct" | "capacity_by_assignee"> & {
    capacity_by_assignee: Record<string, string>;
};

function toStringCapacityRecord(names: string[], task: Task) {
    const record: Record<string, string> = {};
    names.forEach((name) => {
        record[name] = String(toNumberCapacity(task.capacity_by_assignee?.[name] ?? task.capacity_pct ?? 0));
    });
    return record;
}

function toNumberCapacityRecord(names: string[], values: Record<string, string>) {
    const record: Record<string, number> = {};
    names.forEach((name) => {
        record[name] = toNumberCapacity(values[name] ?? 0);
    });
    return record;
}

function getPrimaryCapacity(names: string[], capacities: Record<string, number>) {
    const first = names[0];
    return first ? capacities[first] ?? 0 : 0;
}

export function TaskEditModal({ isOpen, task, members, projects, onClose, onSubmit }: TaskEditModalProps) {
    const [form, setForm] = useState<TaskEditForm | null>(null);

    useEffect(() => {
        if (!task) {
            setForm(null);
            return;
        }

        const assigneeNames = getAssigneeNames(task.assigned_to || task.assignee);
        const leadName = task.leader || task.manager;

        setForm({
            task_id: task.task_id,
            task_name: task.task_name,
            project_name: task.project_name,
            priority: task.priority,
            description: task.description,
            due_date: task.due_date,
            memo: task.memo,
            status: task.status,
            progress_pct: task.progress_pct,
            manager: leadName,
            leader: leadName,
            assignee: joinAssigneeNames(assigneeNames),
            capacity_by_assignee: toStringCapacityRecord(assigneeNames, task),
        });
    }, [task]);

    const selectedAssigneeNames = useMemo(() => getAssigneeNames(form?.assignee ?? ""), [form?.assignee]);

    if (!isOpen || !form) return null;

    const handleChange = <K extends keyof TaskEditForm>(key: K, value: TaskEditForm[K]) => {
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const handleLeadChange = (value: string) => {
        setForm((prev) =>
            prev
                ? {
                    ...prev,
                    manager: value,
                    leader: value,
                }
                : prev,
        );
    };

    const handleToggleAssignee = (memberName: string) => {
        const nextNames = toggleAssigneeName(selectedAssigneeNames, memberName);
        setForm((prev) => {
            if (!prev) return prev;

            const nextCapacities = { ...prev.capacity_by_assignee };
            if (nextNames.includes(memberName) && nextCapacities[memberName] === undefined) {
                nextCapacities[memberName] = "0";
            }
            if (!nextNames.includes(memberName)) {
                delete nextCapacities[memberName];
            }

            return {
                ...prev,
                assignee: joinAssigneeNames(nextNames),
                capacity_by_assignee: nextCapacities,
            };
        });
    };

    const handleCapacityChange = (memberName: string, value: string) => {
        setForm((prev) =>
            prev
                ? {
                    ...prev,
                    capacity_by_assignee: {
                        ...prev.capacity_by_assignee,
                        [memberName]: value,
                    },
                }
                : prev,
        );
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form) return;

        const leadName = form.leader || form.manager;
        const assignee = joinAssigneeNames(selectedAssigneeNames);
        const capacityByAssignee = toNumberCapacityRecord(selectedAssigneeNames, form.capacity_by_assignee);

        onSubmit({
            ...form,
            manager: leadName,
            leader: leadName,
            assignee,
            task_name: form.task_name.trim() || "名称未設定タスク",
            description: form.description.trim(),
            memo: form.memo.trim(),
            capacity_pct: getPrimaryCapacity(selectedAssigneeNames, capacityByAssignee),
            capacity_by_assignee: capacityByAssignee,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">タスク編集</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            Leadがタスクの差配元です。進捗はタスク共通、キャパは担当者ごとに個別設定できます。
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                    >
                        閉じる
                    </button>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">タスク名</span>
                            <input
                                type="text"
                                value={form.task_name}
                                onChange={(event) => handleChange("task_name", event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                maxLength={40}
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">プロジェクト</span>
                            <select
                                value={form.project_name}
                                onChange={(event) => handleChange("project_name", event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {projects.map((project) => (
                                    <option key={project.project_id} value={project.project_name}>
                                        {project.project_name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">優先度</span>
                            <select
                                value={form.priority}
                                onChange={(event) => handleChange("priority", event.target.value as TaskPriority)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {PRIORITY_OPTIONS.map((priority) => (
                                    <option key={priority} value={priority}>
                                        {priority}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">ステータス</span>
                            <select
                                value={form.status}
                                onChange={(event) => handleChange("status", event.target.value as TaskStatus)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">進捗率（タスク共通）</span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={form.progress_pct}
                                onChange={(event) => handleChange("progress_pct", Number(event.target.value))}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Lead</span>
                        <select
                            value={form.leader || form.manager}
                            onChange={(event) => handleLeadChange(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            <option value="">未選択</option>
                            {members.map((member) => (
                                <option key={member.member_id} value={member.member_name}>
                                    {member.member_name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-bold text-slate-700">担当者・個別キャパ</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                    編集画面から担当者追加ができます。ドラッグ＆ドロップは担当者変更です。
                                </p>
                            </div>
                            <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                {selectedAssigneeNames.length}名選択中
                            </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                            {members.map((member) => {
                                const checked = selectedAssigneeNames.includes(member.member_name);

                                return (
                                    <div key={member.member_id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
                                        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => handleToggleAssignee(member.member_name)}
                                                className="h-4 w-4 accent-slate-900"
                                            />
                                            <span>{member.member_name}</span>
                                        </label>
                                        {checked ? (
                                            <label className="mt-2 block">
                                                <span className="mb-1 block text-[11px] font-bold text-slate-500">
                                                    この担当者のキャパ (%)
                                                </span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={form.capacity_by_assignee[member.member_name] ?? ""}
                                                    onChange={(event) => handleCapacityChange(member.member_name, event.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                                                    placeholder="0"
                                                />
                                            </label>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">説明</span>
                            <textarea
                                value={form.description}
                                onChange={(event) => handleChange("description", event.target.value)}
                                className="min-h-[108px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>

                        <div className="space-y-5">
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">期日</span>
                                <input
                                    type="date"
                                    value={form.due_date}
                                    onChange={(event) => handleChange("due_date", event.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">メモ</span>
                                <textarea
                                    value={form.memo}
                                    onChange={(event) => handleChange("memo", event.target.value)}
                                    className="min-h-[108px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            キャンセル
                        </button>

                        <button
                            type="submit"
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                        >
                            保存する
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}