"use client";

import { useState } from "react";
import type { TaskColor } from "@/types/dashboard";

type ProjectColorOption = {
    label: string;
    color: TaskColor;
    accentColor: string;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (input: {
        project_name: string;
        color: TaskColor;
        accentColor: string;
    }) => void;
};

const PROJECT_COLOR_OPTIONS: ProjectColorOption[] = [
    { label: "青", color: "blue", accentColor: "bg-blue-500" },
    { label: "緑", color: "green", accentColor: "bg-green-500" },
    { label: "橙", color: "orange", accentColor: "bg-orange-500" },
    { label: "紫", color: "purple", accentColor: "bg-purple-500" },
    { label: "赤", color: "red", accentColor: "bg-red-500" },
    { label: "水色", color: "cyan", accentColor: "bg-cyan-500" },
    { label: "グレー", color: "slate", accentColor: "bg-slate-500" },
];

export function ProjectAddModal({ isOpen, onClose, onSubmit }: Props) {
    const [projectName, setProjectName] = useState("");
    const [selectedColor, setSelectedColor] = useState<TaskColor>(PROJECT_COLOR_OPTIONS[0].color);

    if (!isOpen) return null;

    const handleClose = () => {
        setProjectName("");
        setSelectedColor(PROJECT_COLOR_OPTIONS[0].color);
        onClose();
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const selected =
            PROJECT_COLOR_OPTIONS.find((option) => option.color === selectedColor) ?? PROJECT_COLOR_OPTIONS[0];

        onSubmit({
            project_name: projectName.trim() || "名称未設定プロジェクト",
            color: selected.color,
            accentColor: selected.accentColor,
        });

        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">プロジェクト追加</h2>
                        <p className="mt-1 text-sm text-slate-500">色付きでプロジェクトを追加できます</p>
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
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">プロジェクト名</span>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(event) => setProjectName(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            placeholder="例: 新規開発案件"
                            maxLength={40}
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">色</span>
                        <select
                            value={selectedColor}
                            onChange={(event) => setSelectedColor(event.target.value as TaskColor)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {PROJECT_COLOR_OPTIONS.map((option) => (
                                <option key={option.color} value={option.color}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <span
                            className={`inline-block h-3 w-3 rounded-full ${(
                                    PROJECT_COLOR_OPTIONS.find((option) => option.color === selectedColor) ??
                                    PROJECT_COLOR_OPTIONS[0]
                                ).accentColor
                                }`}
                        />
                        <span className="text-sm font-medium text-slate-600">選択した色で表示されます</span>
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
                            追加
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}