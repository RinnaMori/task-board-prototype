"use client";

import { useState } from "react";
import type { ScheduleRange, ScheduleType } from "@/types/schedule";

type ScheduleRangeFormProps = {
    onSubmit: (range: ScheduleRange) => void;
};

const initialForm = {
    start_date: "",
    end_date: "",
    type: "available" as ScheduleType,
};

export function ScheduleRangeForm({ onSubmit }: ScheduleRangeFormProps) {
    const [form, setForm] = useState(initialForm);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!form.start_date || !form.end_date) {
            window.alert("開始日と終了日を入力してください。");
            return;
        }

        if (form.start_date > form.end_date) {
            window.alert("終了日は開始日以降にしてください。");
            return;
        }

        onSubmit({
            id: crypto.randomUUID(),
            start_date: form.start_date,
            end_date: form.end_date,
            type: form.type,
        });

        setForm(initialForm);
    };

    return (
        <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">開始日</span>
                    <input
                        type="date"
                        value={form.start_date}
                        onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">終了日</span>
                    <input
                        type="date"
                        value={form.end_date}
                        onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />
                </label>
            </div>

            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">予定種別</span>
                <select
                    value={form.type}
                    onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ScheduleType }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                >
                    <option value="available">⭕️ 稼働可能</option>
                    <option value="unavailable">❌ 忙しい / 稼働不可</option>
                </select>
            </label>

            <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
                期間を追加
            </button>
        </form>
    );
}