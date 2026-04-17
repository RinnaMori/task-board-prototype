"use client";

import { useState } from "react";
import type {
    Member,
    NewTaskInput,
    Project,
} from "@/types/dashboard";

type TaskAddModalProps = {
    isOpen: boolean;
    members: Member[];
    projects: Project[];
    onClose: () => void;
    onSubmit: (task: NewTaskInput) => void;
};

const initialForm = (members: Member[]): NewTaskInput => ({
    task_name: "",
    project_name: "",
    description: "",
    assigned_to: members[0]?.member_name ?? "",

    manager: members[0]?.member_name ?? "",
    leader: members[0]?.member_name ?? "",
    assignee: members[0]?.member_name ?? "",
    capacity_pct: 0,

    due_date: "",
    memo: "",
});

export function TaskAddModal({
    isOpen,
    members,
    projects,
    onClose,
    onSubmit,
}: TaskAddModalProps) {
    const [form, setForm] = useState<NewTaskInput>(initialForm(members));

    if (!isOpen) return null;

    const handleChange = (
        key: keyof NewTaskInput,
        value: string | number,
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
            task_name: form.task_name.trim() || "名称未設定タスク",
            project_name: form.project_name || "その他",
            description: form.description.trim(),

            assigned_to: form.assigned_to || form.assignee || fallbackMember,

            manager: form.manager || fallbackMember,
            leader: form.leader || fallbackMember,
            assignee: form.assignee || form.assigned_to || fallbackMember,
            capacity_pct: Number(form.capacity_pct) || 0,

            due_date: form.due_date,
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
                            プロジェクトごとに色が自動で統一されます
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
                                placeholder="未入力なら自動で仮名を入れます"
                                maxLength={20}
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">
                                担当者
                            </span>
                            <select
                                value={form.assigned_to}
                                onChange={(e) => {
                                    handleChange("assigned_to", e.target.value);
                                    handleChange("assignee", e.target.value);
                                }}
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

                    <div className="grid gap-5 md:grid-cols-2">
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
                                キャパ(%)
                            </span>
                            <input
                                type="number"
                                value={form.capacity_pct}
                                onChange={(e) =>
                                    handleChange("capacity_pct", Number(e.target.value))
                                }
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
                            placeholder="未入力でも保存できます"
                            maxLength={150}
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
                            placeholder="空でもOK"
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
                            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            キャンセル
                        </button>

                        <button
                            type="submit"
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
                        >
                            追加する
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}