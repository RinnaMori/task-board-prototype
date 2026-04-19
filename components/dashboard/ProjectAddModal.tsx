"use client";

import { useState } from "react";
import type { TaskColor } from "@/types/dashboard";
import { TASK_COLOR_ACCENTS } from "@/lib/dashboard-store";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (input: {
        project_name: string;
        color: TaskColor;
        accentColor: string;
    }) => void;
};

const colors: { label: string; value: TaskColor }[] = [
    { label: "青", value: "blue" },
    { label: "緑", value: "green" },
    { label: "橙", value: "orange" },
    { label: "紫", value: "purple" },
    { label: "赤", value: "red" },
    { label: "水色", value: "cyan" },
    { label: "グレー", value: "slate" },
];

export function ProjectAddModal({ isOpen, onClose, onSubmit }: Props) {
    const [name, setName] = useState("");
    const [color, setColor] = useState<TaskColor>("blue");

    if (!isOpen) return null;

    const handleClose = () => {
        setName("");
        setColor("blue");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">プロジェクト追加</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">色分け付きで新規プロジェクトを登録します</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                    >
                        閉じる
                    </button>
                </div>

                <div className="space-y-5">
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">プロジェクト名</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="例: 新規アポ開拓"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">カラー</span>
                        <select
                            value={color}
                            onChange={(event) => setColor(event.target.value as TaskColor)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {colors.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                        <span className={`h-3 w-3 rounded-full ${TASK_COLOR_ACCENTS[color]}`} />
                        選択中の色でタスクカードを表示します
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
                            type="button"
                            onClick={() => {
                                onSubmit({
                                    project_name: name.trim() || "名称未設定プロジェクト",
                                    color,
                                    accentColor: TASK_COLOR_ACCENTS[color],
                                });
                                handleClose();
                            }}
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                        >
                            追加する
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}