"use client";

import { useState } from "react";
import type { MemberRole } from "@/types/dashboard";

type MemberAddModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (input: {
        member_name: string;
        member_role: string;
        columnColor: string;
    }) => void;
};

const MEMBER_ROLE_OPTIONS: MemberRole[] = ["Lead", "正社員", "業務委託"];

const MEMBER_COLUMN_COLOR_OPTIONS = [
    { label: "青", value: "border-sky-400" },
    { label: "緑", value: "border-emerald-400" },
    { label: "橙", value: "border-amber-400" },
    { label: "紫", value: "border-purple-400" },
    { label: "赤", value: "border-rose-400" },
    { label: "ピンク", value: "border-pink-400" },
    { label: "水色", value: "border-cyan-400" },
    { label: "青紫", value: "border-indigo-400" },
    { label: "黄緑", value: "border-lime-400" },
    { label: "グレー", value: "border-slate-400" },
] as const;

export function MemberAddModal({ isOpen, onClose, onSubmit }: MemberAddModalProps) {
    const [memberName, setMemberName] = useState("");
    const [memberRole, setMemberRole] = useState<MemberRole>("業務委託");
    const [columnColor, setColumnColor] = useState("border-sky-400");

    if (!isOpen) return null;

    const handleClose = () => {
        setMemberName("");
        setMemberRole("業務委託");
        setColumnColor("border-sky-400");
        onClose();
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        onSubmit({
            member_name: memberName.trim() || "名称未設定メンバー",
            member_role: memberRole,
            columnColor,
        });

        handleClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">メンバー追加</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            役職と色を選んで新しいメンバーを追加できます
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
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">メンバー名</span>
                        <input
                            type="text"
                            value={memberName}
                            onChange={(event) => setMemberName(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            placeholder="例: 田中 太郎"
                            maxLength={30}
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">役職</span>
                        <select
                            value={memberRole}
                            onChange={(event) => setMemberRole(event.target.value as MemberRole)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {MEMBER_ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">パネル色</span>
                        <select
                            value={columnColor}
                            onChange={(event) => setColumnColor(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {MEMBER_COLUMN_COLOR_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
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