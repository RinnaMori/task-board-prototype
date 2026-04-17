"use client";

import { useEffect, useState } from "react";
import type {
    Task,
    TaskStatus,
    UpdateTaskInput,
    Project,
    Member,
} from "@/types/dashboard";

type TaskEditModalProps = {
    isOpen: boolean;
    task: Task | null;
    projects: Project[];
    members: Member[];
    onClose: () => void;
    onSubmit: (task: UpdateTaskInput) => void;
};

const statusOptions: TaskStatus[] = ["未着手", "進行中", "完了", "保留"];

type EditFormState = {
    task_id: string;
    task_name: string;
    project_name: string;
    description: string;
    due_date: string;
    memo: string;
    status: TaskStatus;
    progress_pct: number;

    manager: string;
    leader: string;
    assignee: string;
    capacity_pct: number;
};

const createInitialState = (task: Task | null): EditFormState => ({
    task_id: task?.task_id ?? "",
    task_name: task?.task_name ?? "",
    project_name: task?.project_name ?? "",
    description: task?.description ?? "",
    due_date: task?.due_date ?? "",
    memo: task?.memo ?? "",
    status: task?.status ?? "未着手",
    progress_pct: task?.progress_pct ?? 0,

    manager: task?.manager ?? "",
    leader: task?.leader ?? "",
    assignee: task?.assignee ?? "",
    capacity_pct: task?.capacity_pct ?? 0,
});

export function TaskEditModal({
    isOpen,
    task,
    projects,
    members,
    onClose,
    onSubmit,
}: TaskEditModalProps) {
    const [form, setForm] = useState<EditFormState>(createInitialState(task));

    useEffect(() => {
        setForm(createInitialState(task));
    }, [task]);

    if (!isOpen || !task) return null;

    const handleChange = (
        key: keyof EditFormState,
        value: string | number | TaskStatus,
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const fallbackMember = members[0]?.member_name ?? "未設定";

        onSubmit({
            task_id: form.task_id,
            task_name: form.task_name.trim() || "名称未設定タスク",
            project_name: form.project_name || "その他",
            description: form.description.trim(),
            due_date: form.due_date,
            memo: form.memo.trim().slice(0, 30),
            status: form.status,
            progress_pct: Math.max(0, Math.min(100, Number(form.progress_pct) || 0)),

            manager: form.manager || fallbackMember,
            leader: form.leader || fallbackMember,
            assignee: form.assignee || fallbackMember,
            capacity_pct: Number(form.capacity_pct) || 0,
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            タスク編集
                        </h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            Manager / Leader / 担当者 / キャパを編集できます
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
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                タスク名
                            </span>
                            <input
                                type="text"
                                value={form.task_name}
                                onChange={(e) => handleChange("task_name", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                maxLength={20}
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                プロジェクト
                            </span>
                            <select
                                value={form.project_name}
                                onChange={(e) => handleChange("project_name", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                <option value="">プロジェクト選択</option>
                                {projects.map((p) => (
                                    <option key={p.project_id} value={p.project_name}>
                                        {p.project_name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                Manager
                            </span>
                            <select
                                value={form.manager}
                                onChange={(e) => handleChange("manager", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {members.map((m) => (
                                    <option key={m.member_id} value={m.member_name}>
                                        {m.member_name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                Leader
                            </span>
                            <select
                                value={form.leader}
                                onChange={(e) => handleChange("leader", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {members.map((m) => (
                                    <option key={m.member_id} value={m.member_name}>
                                        {m.member_name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                担当者
                            </span>
                            <select
                                value={form.assignee}
                                onChange={(e) => handleChange("assignee", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {members.map((m) => (
                                    <option key={m.member_id} value={m.member_name}>
                                        {m.member_name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                ステータス
                            </span>
                            <select
                                value={form.status}
                                onChange={(e) =>
                                    handleChange("status", e.target.value as TaskStatus)
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                進捗率
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={form.progress_pct}
                                onChange={(e) =>
                                    handleChange("progress_pct", Number(e.target.value))
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                キャパ(%)
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={form.capacity_pct}
                                onChange={(e) =>
                                    handleChange("capacity_pct", Number(e.target.value))
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                期日
                            </span>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={(e) => handleChange("due_date", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                メモ（30字以内）
                            </span>
                            <input
                                type="text"
                                value={form.memo}
                                onChange={(e) => handleChange("memo", e.target.value.slice(0, 30))}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                maxLength={30}
                            />
                            <span className="mt-2 block text-xs text-slate-400">
                                {form.memo.length}/30
                            </span>
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">
                            内容
                        </span>
                        <textarea
                            value={form.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            maxLength={150}
                        />
                    </label>

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