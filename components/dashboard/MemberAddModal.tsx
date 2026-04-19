"use client";

import { useState } from "react";

type MemberAddModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (input: {
        member_name: string;
        columnColor: string;
    }) => void;
};

const colorOptions = [
    { label: "青", value: "border-sky-400" },
    { label: "緑", value: "border-emerald-400" },
    { label: "橙", value: "border-amber-400" },
    { label: "紫", value: "border-purple-400" },
];

export function MemberAddModal({ isOpen, onClose, onSubmit }: MemberAddModalProps) {
    const [memberName, setMemberName] = useState("");
    const [columnColor, setColumnColor] = useState("border-sky-400");

    if (!isOpen) return null;

    const handleClose = () => {
        setMemberName("");
        setColumnColor("border-sky-400");
        onClose();
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        onSubmit({
            member_name: memberName.trim() || "名称未設定メンバー",
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
                        <p className="mt-1 text-sm font-medium text-slate-500">新しい担当者のカラムを追加できます</p>
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
                            placeholder="例: インターン C"
                            maxLength={20}
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">パネル色</span>
                        <select
                            value={columnColor}
                            onChange={(event) => setColumnColor(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {colorOptions.map((option) => (
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