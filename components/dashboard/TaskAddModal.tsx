"use client";

import { useEffect, useState } from "react";
import { PRIORITY_OPTIONS } from "@/lib/dashboard-store";
import type { Member, NewTaskInput, Project, TaskPriority } from "@/types/dashboard";

type TaskAddModalProps = {
    isOpen: boolean;
    onClose: () => void;
    members: Member[];
    projects: Project[];
    onSubmit: (input: NewTaskInput) => void;
};

type TaskAddForm = Omit<NewTaskInput, "capacity_pct"> & {
    capacity_pct: string;
};

const initialForm: TaskAddForm = {
    task_name: "",
    project_name: "",
    priority: "中",
    description: "",
    manager: "",
    leader: "",
    assignee: "",
    capacity_pct: "",
    due_date: "",
    memo: "",
};

export function TaskAddModal({
    isOpen,
    onClose,
    members,
    projects,
    onSubmit,
}: TaskAddModalProps) {
    const [form, setForm] = useState<TaskAddForm>(initialForm);

    useEffect(() => {
        if (!isOpen) return;

        const defaultManager = members[0]?.member_name ?? "";

        setForm({
            ...initialForm,
            project_name: projects[0]?.project_name ?? "",
            manager: defaultManager,
        });
    }, [isOpen, members, projects]);

    if (!isOpen) return null;

    const handleChange = <K extends keyof TaskAddForm>(key: K, value: TaskAddForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleClose = () => {
        setForm(initialForm);
        onClose();
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        onSubmit({
            ...form,
            task_name: form.task_name.trim() || "名称未設定タスク",
            description: form.description.trim(),
            memo: form.memo.trim(),
            capacity_pct: form.capacity_pct === "" ? 0 : Number(form.capacity_pct) || 0,
        });

        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">タスク追加</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            Leader / 担当者 / キャパは未選択でも追加できます
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
                            <span className="mb-2 block text-sm font-bold text-slate-700">タスク名</span>
                            <input
                                type="text"
                                value={form.task_name}
                                onChange={(event) => handleChange("task_name", event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                maxLength={40}
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">プロジェクト</span>
                            <select
                                value={form.project_name}
                                onChange={(event) => handleChange("project_name", event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                required
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

                        <label className="block md:col-span-3">
                            <span className="mb-2 block text-sm font-bold text-slate-700">説明</span>
                            <input
                                type="text"
                                value={form.description}
                                onChange={(event) => handleChange("description", event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                maxLength={120}
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

                    <div className="grid gap-5 md:grid-cols-3">
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
                            <input
                                type="text"
                                value={form.memo}
                                onChange={(event) => handleChange("memo", event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                                maxLength={120}
                            />
                        </label>
                    </div>

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