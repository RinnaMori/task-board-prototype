"use client";

import { useEffect, useState } from "react";
import { getTodayStatus, getTypeLabel, loadScheduleStore } from "@/lib/schedule-utils";
import type { MemberSchedule } from "@/types/schedule";

type MemberScheduleDetailModalProps = {
    isOpen: boolean;
    memberName: string | null;
    onClose: () => void;
};

export function MemberScheduleDetailModal({
    isOpen,
    memberName,
    onClose,
}: MemberScheduleDetailModalProps) {
    const [member, setMember] = useState<MemberSchedule | null>(null);

    useEffect(() => {
        if (!isOpen || !memberName) return;

        const sync = () => {
            const store = loadScheduleStore();
            const target = store.members.find((item) => item.member_name === memberName) ?? null;
            setMember(target);
        };

        sync();
        window.addEventListener("storage", sync);
        window.addEventListener("schedule-store-updated", sync as EventListener);

        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("schedule-store-updated", sync as EventListener);
        };
    }, [isOpen, memberName]);

    if (!isOpen) return null;

    const todayStatus = member ? getTodayStatus(member.member_name, [member]) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">{memberName}</h2>
                        <p className="mt-1 text-sm text-slate-500">稼働曜日、勤務形態、登録済み期間の詳細です。</p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100"
                    >
                        閉じる
                    </button>
                </div>

                {!member ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        このメンバーのスケジュール情報はまだありません。
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-bold text-slate-700">今日の状態</p>
                                <p className="mt-2 text-lg font-extrabold text-slate-900">
                                    {todayStatus === "available"
                                        ? "⭕️ 稼働可能"
                                        : todayStatus === "unavailable"
                                            ? "❌ 忙しい / 稼働不可"
                                            : "登録なし"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-bold text-slate-700">主な稼働曜日</p>
                                <p className="mt-2 text-lg font-extrabold text-slate-900">
                                    {member.weekdays.length > 0 ? member.weekdays.join("・") : "未設定"}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-bold text-slate-700">勤務形態</p>
                                <p className="mt-2 text-lg font-extrabold text-slate-900">{member.work_style}</p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="mb-3 text-sm font-bold text-slate-700">登録済み期間</p>

                            {member.schedules.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                                    まだ期間登録はありません。
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {member.schedules.map((range) => (
                                        <div key={range.id} className="rounded-2xl bg-white px-4 py-3">
                                            <p className="text-sm font-bold text-slate-900">
                                                {range.start_date} 〜 {range.end_date}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-600">{getTypeLabel(range.type)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}