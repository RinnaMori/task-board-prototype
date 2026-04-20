"use client";

import { useEffect, useState } from "react";
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/lib/dashboard-store";
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

type TaskEditForm = Omit<UpdateTaskInput, "capacity_pct"> & {
    capacity_pct: string;
};

export function TaskEditModal({
    isOpen,
    task,
    members,
    projects,
    onClose,
    onSubmit,
}: TaskEditModalProps) {
    const [form, setForm] = useState<TaskEditForm | null>(null);

    useEffect(() => {
        if (!task) {
            setForm(null);
            return;
        }

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
            manager: task.manager,
            leader: task.leader,
            assignee: task.assignee,
            capacity_pct: task.capacity_pct ? String(task.capacity_pct) : "",
        });
    }, [task]);

    if (!isOpen || !form) return null;

    const handleChange = <K extends keyof TaskEditForm>(key: K, value: TaskEditForm[K]) => {
        setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form) return;

        onSubmit({
            ...form,
            task_name: form.task_name.trim() || "名称未設定タスク",
            description: form.description.trim(),
            memo: form.memo.trim(),
            capacity_pct: form.capacity_pct === "" ? 0 : Number(form.capacity_pct) || 0,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">タスク編集</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">担当とキャパは未選択に戻すこともできます</p>
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

                    <div className="grid gap-5 md:grid-cols-4">
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
                            <span className="mb-2 block text-sm font-bold text-slate-700">進捗率</span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={form.progress_pct}
                                onChange={(event) => handleChange("progress_pct", Number(event.target.value))}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">キャパ (%)</span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={form.capacity_pct}
                                onChange={(event) => handleChange("capacity_pct", event.target.value)}
                                placeholder="未選択"
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">Manager</span>
                            <select
                                value={form.manager}
                                onChange={(event) => handleChange("manager", event.target.value)}
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

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">Leader</span>
                            <select
                                value={form.leader}
                                onChange={(event) => handleChange("leader", event.target.value)}
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

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">担当者</span>
                            <select
                                value={form.assignee}
                                onChange={(event) => handleChange("assignee", event.target.value)}
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