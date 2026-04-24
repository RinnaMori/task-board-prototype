"use client";

import { useEffect, useState } from "react";
import { getTypeLabel, getTodayDateString } from "@/lib/schedule-utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { MemberSchedule, ScheduleRange, ScheduleType, Weekday } from "@/types/schedule";

type MemberScheduleDetailModalProps = {
    isOpen: boolean;
    memberName: string | null;
    onClose: () => void;
    onEdit: (member_name: string, range: ScheduleRange) => void;
};

type ScheduleRow = {
    id: string;
    member_name: string;
    type: ScheduleType;
    start_date: string;
    end_date: string;
    weekdays: string[] | null;
    work_style: MemberSchedule["work_style"] | null;
    created_at?: string;
};

function isTodayInRange(today: string, range: ScheduleRange) {
    return range.start_date <= today && today <= range.end_date;
}

function getTodayStatusFromMember(member: MemberSchedule | null): ScheduleType | null {
    if (!member) return null;

    const today = getTodayDateString();

    const unavailable = member.schedules.find(
        (schedule) => schedule.type === "unavailable" && isTodayInRange(today, schedule),
    );
    if (unavailable) return "unavailable";

    const available = member.schedules.find(
        (schedule) => schedule.type === "available" && isTodayInRange(today, schedule),
    );
    if (available) return "available";

    return null;
}

function sortRanges(ranges: ScheduleRange[]) {
    return [...ranges].sort((a, b) => {
        if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
        return a.end_date.localeCompare(b.end_date);
    });
}

async function fetchMemberSchedule(memberName: string): Promise<MemberSchedule | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("schedules")
        .select("id, member_name, type, start_date, end_date, weekdays, work_style, created_at")
        .eq("member_name", memberName)
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    const rows = (data ?? []) as ScheduleRow[];
    if (rows.length === 0) return null;

    const first = rows[0];

    return {
        member_name: memberName,
        weekdays: Array.isArray(first.weekdays) ? (first.weekdays as Weekday[]) : [],
        work_style: first.work_style ?? "どちらも可",
        schedules: sortRanges(
            rows.map((row) => ({
                id: row.id,
                type: row.type,
                start_date: row.start_date,
                end_date: row.end_date,
            })),
        ),
    };
}

export function MemberScheduleDetailModal({
    isOpen,
    memberName,
    onClose,
    onEdit,
}: MemberScheduleDetailModalProps) {
    const [member, setMember] = useState<MemberSchedule | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !memberName) return;

        let active = true;

        const sync = async () => {
            try {
                setIsLoading(true);
                const target = await fetchMemberSchedule(memberName);
                if (!active) return;
                setMember(target);
            } catch (error) {
                if (!active) return;
                console.error("❌ schedule 詳細取得失敗", error);
                setMember(null);
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };

        sync();

        return () => {
            active = false;
        };
    }, [isOpen, memberName]);

    const handleDeleteRange = async (rangeId: string) => {
        if (!memberName) return;

        const confirmed = window.confirm("この申告期間を削除します。よろしいですか？");
        if (!confirmed) return;

        try {
            setDeletingId(rangeId);

            const supabase = getSupabaseClient();

            const { error } = await supabase.from("schedules").delete().eq("id", rangeId);

            if (error) {
                console.error("❌ schedule 削除失敗", error);
                alert(`スケジュール削除失敗: ${error.message}`);
                return;
            }

            const nextMember = await fetchMemberSchedule(memberName);
            setMember(nextMember);
            window.dispatchEvent(new Event("schedule-store-updated"));
        } catch (error) {
            console.error("❌ schedule 削除エラー", error);
            alert(
                error instanceof Error
                    ? `スケジュール削除失敗: ${error.message}`
                    : "スケジュール削除失敗",
            );
        } finally {
            setDeletingId(null);
        }
    };

    if (!isOpen) return null;

    const todayStatus = getTodayStatusFromMember(member);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">{memberName}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            稼働曜日、勤務形態、登録済み期間の詳細です。
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

                {isLoading ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                        読み込み中...
                    </div>
                ) : !member ? (
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
                                <p className="mt-2 text-lg font-extrabold text-slate-900">
                                    {member.work_style}
                                </p>
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
                                        <div
                                            key={range.id}
                                            className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {range.start_date} 〜 {range.end_date}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    {getTypeLabel(range.type)}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(member.member_name, range)}
                                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    編集
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRange(String(range.id))}
                                                    disabled={deletingId === range.id}
                                                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {deletingId === range.id ? "削除中..." : "削除"}
                                                </button>
                                            </div>
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