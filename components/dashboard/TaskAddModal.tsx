"use client";

import { useState } from "react";
import type { Member, NewTaskInput, TaskColor } from "@/types/dashboard";

type TaskAddModalProps = {
    isOpen: boolean;
    members: Member[];
    onClose: () => void;
    onSubmit: (task: NewTaskInput) => void;
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

const initialForm = (members: Member[]): NewTaskInput => ({
    task_name: "",
    description: "",
    assigned_to: members[0]?.member_name ?? "",
    due_date: "",
    memo: "",
    color: "blue",
});

export function TaskAddModal({
    isOpen,
    members,
    onClose,
    onSubmit,
}: TaskAddModalProps) {
    const [form, setForm] = useState<NewTaskInput>(initialForm(members));

    if (!isOpen) return null;

    const handleChange = (
        key: keyof NewTaskInput,
        value: string | TaskColor,
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
        if (!form.assigned_to) return;
        if (!form.due_date) return;
        if (!form.memo.trim()) return;

        onSubmit({
            ...form,
            task_name: form.task_name.trim(),
            description: form.description.trim(),
            memo: form.memo.trim().slice(0, 30),
        });

        setForm(initialForm(members));
        onClose();
    };

    const handleClose = () => {
        setForm(initialForm(members));
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            タスク追加
                        </h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            内容を入力すると、選択した担当者のパネルに追加されます
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
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
                                placeholder="例: 要件定義レビュー"
                                maxLength={20}
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                担当者
                            </span>
                            <select
                                value={form.assigned_to}
                                onChange={(e) => handleChange("assigned_to", e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            >
                                {members.map((member) => (
                                    <option key={member.member_id} value={member.member_name}>
                                        {member.member_name}
                                    </option>
                                ))}
                            </select>
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
                            placeholder="タスク内容を入力"
                            maxLength={150}
                        />
                    </label>

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
                            placeholder="例: 優先度高め"
                            maxLength={30}
                        />
                        <span className="mt-2 block text-xs text-slate-400">
                            {form.memo.length}/30
                        </span>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            キャンセル
                        </button>

                        <button
                            type="submit"
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                        >
                            追加する
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}