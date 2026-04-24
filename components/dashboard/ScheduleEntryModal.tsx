"use client";

import { useEffect, useState } from "react";
import { WEEKDAY_OPTIONS, WORK_STYLE_OPTIONS } from "@/lib/schedule-utils";
import type { MemberSchedule, ScheduleRange, ScheduleType, Weekday, WorkStyle } from "@/types/schedule";

type ScheduleEntryModalProps = {
    isOpen: boolean;
    members: MemberSchedule[];
    onClose: () => void;
    onSubmit: (input: {
        member_name: string;
        weekdays: Weekday[];
        work_style: WorkStyle;
        range: ScheduleRange;
    }) => void;
    editingRange?: {
        member_name: string;
        range: ScheduleRange;
    } | null;
};

export function ScheduleEntryModal({
    isOpen,
    members,
    onClose,
    onSubmit,
    editingRange = null,
}: ScheduleEntryModalProps) {
    const [memberName, setMemberName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [type, setType] = useState<ScheduleType>("available");
    const [weekdays, setWeekdays] = useState<Weekday[]>([]);
    const [workStyle, setWorkStyle] = useState<WorkStyle>("どちらも可");

    useEffect(() => {
        if (!isOpen) return;

        if (editingRange) {
            const target = members.find((member) => member.member_name === editingRange.member_name);

            setMemberName(editingRange.member_name);
            setStartDate(editingRange.range.start_date);
            setEndDate(editingRange.range.end_date);
            setType(editingRange.range.type);
            setWeekdays(target?.weekdays ?? []);
            setWorkStyle(target?.work_style ?? "どちらも可");
            return;
        }

        const first = members[0];
        if (!first) return;

        setMemberName(first.member_name);
        setWeekdays(first.weekdays);
        setWorkStyle(first.work_style);
        setStartDate("");
        setEndDate("");
        setType("available");
    }, [isOpen, members, editingRange]);

    if (!isOpen) return null;

    const isEditMode = Boolean(editingRange);

    const handleMemberChange = (nextMemberName: string) => {
        setMemberName(nextMemberName);
        const target = members.find((member) => member.member_name === nextMemberName);
        if (!target) return;
        setWeekdays(target.weekdays);
        setWorkStyle(target.work_style);
    };

    const toggleWeekday = (weekday: Weekday) => {
        setWeekdays((prev) =>
            prev.includes(weekday) ? prev.filter((item) => item !== weekday) : [...prev, weekday],
        );
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!memberName) {
            window.alert("メンバーを選択してください。");
            return;
        }
        if (!startDate || !endDate) {
            window.alert("開始日と終了日を入力してください。");
            return;
        }
        if (startDate > endDate) {
            window.alert("終了日は開始日以降にしてください。");
            return;
        }

        onSubmit({
            member_name: memberName,
            weekdays: WEEKDAY_OPTIONS.filter((item) => weekdays.includes(item)),
            work_style: workStyle,
            range: {
                id: editingRange?.range.id ?? crypto.randomUUID(),
                start_date: startDate,
                end_date: endDate,
                type,
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                            {isEditMode ? "スケジュール編集" : "スケジュール新規登録"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            メンバー、期間、予定種別、曜日、勤務形態をまとめて登録できます。
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
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">メンバー</span>
                        <select
                            value={memberName}
                            onChange={(event) => handleMemberChange(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {members.map((member) => (
                                <option key={member.member_name} value={member.member_name}>
                                    {member.member_name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="grid gap-5 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">開始日</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-bold text-slate-700">終了日</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                            />
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">予定種別</span>
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value as ScheduleType)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            <option value="available">⭕️ 稼働可能</option>
                            <option value="unavailable">❌ 忙しい / 稼働不可</option>
                        </select>
                    </label>

                    <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-3 text-sm font-bold text-slate-700">主に稼働しやすい曜日</p>
                        <div className="flex flex-wrap gap-2">
                            {WEEKDAY_OPTIONS.map((weekday) => {
                                const active = weekdays.includes(weekday);
                                return (
                                    <button
                                        key={weekday}
                                        type="button"
                                        onClick={() => toggleWeekday(weekday)}
                                        className={`rounded-full px-3 py-2 text-sm font-bold transition ${active
                                                ? "bg-slate-900 text-white"
                                                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                            }`}
                                    >
                                        {weekday}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">勤務形態</span>
                        <select
                            value={workStyle}
                            onChange={(event) => setWorkStyle(event.target.value as WorkStyle)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                        >
                            {WORK_STYLE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
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
                            {isEditMode ? "更新する" : "登録する"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}