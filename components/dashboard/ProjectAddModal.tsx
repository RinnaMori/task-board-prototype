"use client";

import { useState } from "react";
import type { TaskColor } from "@/types/dashboard";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (input: {
        project_name: string;
        color: TaskColor;
    }) => void;
};

const colors: { label: string; value: TaskColor; accent: string }[] = [
    { label: "青", value: "blue", accent: "bg-blue-500" },
    { label: "緑", value: "green", accent: "bg-green-500" },
    { label: "橙", value: "orange", accent: "bg-orange-500" },
    { label: "紫", value: "purple", accent: "bg-purple-500" },
    { label: "赤", value: "red", accent: "bg-red-500" },
    { label: "水色", value: "cyan", accent: "bg-cyan-500" },
];

export function ProjectAddModal({ isOpen, onClose, onSubmit }: Props) {
    const [name, setName] = useState("");
    const [color, setColor] = useState<TaskColor>("blue");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white p-6">
                <h2 className="mb-4 text-xl font-bold">プロジェクト追加</h2>

                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="プロジェクト名"
                    className="mb-4 w-full rounded border p-2"
                />

                <select
                    value={color}
                    onChange={(e) => setColor(e.target.value as TaskColor)}
                    className="mb-4 w-full rounded border p-2"
                >
                    {colors.map((c) => (
                        <option key={c.value} value={c.value}>
                            {c.label}
                        </option>
                    ))}
                </select>

                <div className="flex justify-end gap-2">
                    <button onClick={onClose}>キャンセル</button>
                    <button
                        onClick={() => {
                            onSubmit({ project_name: name || "名称未設定", color });
                            onClose();
                        }}
                        className="bg-black px-3 py-1 text-white rounded"
                    >
                        追加
                    </button>
                </div>
            </div>
        </div>
    );
}