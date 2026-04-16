"use client";

import { useEffect, useState } from "react";
import type { Task, TaskColor, TaskStatus, UpdateTaskInput } from "@/types/dashboard";

type TaskEditModalProps = {
    isOpen: boolean;
    task: Task | null;
    onClose: () => void;
    onSubmit: (task: UpdateTaskInput) => void;
};

const colorOptions: { value: TaskColor; label: string }[] = [
    { value: "blue", label: "青" },
    { value: "green", label: "緑" },
    { value: "orange", label: "橙" },
    { value: "purple", label: "紫" },
    { value: "red", label: "赤" },
    { value: "yellow", label: "黄" },
    { value: "cyan", label: "水色" },
];

const statusOptions: TaskStatus[] = ["未着手", "進行中", "完了", "保留"];

type EditFormState = {
    task_id: string;
    task_name: string;
    description: string;
    due_date: string;
    memo: string;
    color: TaskColor;
    status: TaskStatus;
    progress_pct: number;
};

const createInitialState = (task: Task | null): EditFormState => ({
    task_id: task?.task_id ?? "",
    task_name: task?.task_name ?? "",
    description: task?.description ?? "",
    due_date: task?.due_date ?? "",
    memo: task?.memo ?? "",
    color: task?.color ?? "blue",
    status: task?.status ?? "未着手",
    progress_pct: task?.progress_pct ?? 0,
});

export function TaskEditModal({
    isOpen,
    task,
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
        value: string | number | TaskColor | TaskStatus,
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!form.task_name.trim()) return;
        if (!form.description.trim()) return;
        if (!form.due_date) return;
        if (!form.memo.trim()) return;

        onSubmit({
            task_id: form.task_id,
            task_name: form.task_name.trim(),
            description: form.description.trim(),
            due_date: form.due_date,
            memo: form.memo.trim().slice(0, 30),
            color: form.color,
            status: form.status,
            progress_pct: Math.max(0, Math.min(100, form.progress_pct)),
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
                            タスク内容・ステータス・進捗率を更新できます
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
                                期日
                            </span>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={(e) => handleChange("due_date", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
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
                                色
                            </span>
                            <select
                                value={form.color}
                                onChange={(e) =>
                                    handleChange("color", e.target.value as TaskColor)
                                }
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {colorOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

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