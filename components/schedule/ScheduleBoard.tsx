"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { MemberScheduleDetailModal } from "@/components/dashboard/MemberScheduleDetailModal";
import { ScheduleEntryModal } from "@/components/dashboard/ScheduleEntryModal";
import { loadDashboardStore } from "@/lib/dashboard-store";
import {
    buildTimelineDates,
    createEmptyMemberSchedule,
    getDateStatus,
    getTodayDateString,
    getTypeLabel,
    getWeekdayLabel,
    loadScheduleStore,
    saveScheduleStore,
    sortScheduleRanges,
} from "@/lib/schedule-utils";
import type { MemberSchedule, ScheduleStore, ScheduleType } from "@/types/schedule";

function getCellClasses(
    current: ScheduleType | null,
    prev: ScheduleType | null,
    next: ScheduleType | null,
) {
    if (!current) return "bg-transparent";

    const base =
        current === "available"
            ? "bg-sky-500 text-white"
            : "bg-rose-500 text-white";

    const left = prev !== current ? "rounded-l-full" : "";
    const right = next !== current ? "rounded-r-full" : "";

    return `${base} ${left} ${right}`;
}

function mergeMembersWithDashboard(scheduleStore: ScheduleStore): ScheduleStore {
    const dashboardStore = loadDashboardStore();
    const dashboardMemberNames = dashboardStore.members.map((member) => member.member_name);

    const existingMap = new Map(
        scheduleStore.members.map((member) => [member.member_name, member]),
    );

    return {
        members: dashboardMemberNames.map(
            (memberName) => existingMap.get(memberName) ?? createEmptyMemberSchedule(memberName),
        ),
    };
}

export function ScheduleBoard() {
    const [store, setStore] = useState<ScheduleStore>({ members: [] });
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [detailMemberName, setDetailMemberName] = useState<string | null>(null);

    useEffect(() => {
        const sync = () => {
            const merged = mergeMembersWithDashboard(loadScheduleStore());
            setStore(merged);
            saveScheduleStore(merged);
        };

        sync();
        window.addEventListener("storage", sync);
        window.addEventListener("schedule-store-updated", sync as EventListener);

        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("schedule-store-updated", sync as EventListener);
        };
    }, []);

    const timelineDates = useMemo(() => buildTimelineDates(28, 0), []);
    const today = getTodayDateString();

    const handleSubmitEntry = (input: {
        member_name: string;
        weekdays: MemberSchedule["weekdays"];
        work_style: MemberSchedule["work_style"];
        range: MemberSchedule["schedules"][number];
    }) => {
        const nextStore: ScheduleStore = {
            members: store.members.map((member) =>
                member.member_name === input.member_name
                    ? {
                        ...member,
                        weekdays: input.weekdays,
                        work_style: input.work_style,
                        schedules: sortScheduleRanges([...member.schedules, input.range]),
                    }
                    : member,
            ),
        };

        setStore(nextStore);
        saveScheduleStore(nextStore);
        setIsEntryModalOpen(false);
    };

    return (
        <>
            <AppShell
                title="スケジュール申告"
                description="横軸が当日から4週間分のタイムラインです。"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setIsEntryModalOpen(true)}
                            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                        >
                            新規登録
                        </button>
                        <Link
                            href="/dashboard"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            ダッシュボードへ戻る
                        </Link>
                    </div>
                }
            >
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-xl font-extrabold text-slate-900">全体タイムライン</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            当日から4週間分を表示しています。メンバー名またはバーを押すと詳細が開きます。
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[1500px]">
                            <div
                                className="grid gap-2"
                                style={{ gridTemplateColumns: `220px repeat(${timelineDates.length}, minmax(52px, 1fr))` }}
                            >
                                <div className="sticky left-0 z-10 rounded-2xl bg-white px-3 py-3 text-sm font-bold text-slate-700">
                                    メンバー
                                </div>

                                {timelineDates.map((date) => {
                                    const isToday = date === today;
                                    return (
                                        <div
                                            key={date}
                                            className={`rounded-2xl px-2 py-3 text-center text-xs font-bold ${isToday ? "bg-amber-100 text-amber-800" : "bg-slate-50 text-slate-600"
                                                }`}
                                        >
                                            <div>{date.slice(5)}</div>
                                            <div className="mt-1">{getWeekdayLabel(date)}</div>
                                        </div>
                                    );
                                })}

                                {store.members.map((member) => (
                                    <FragmentRow
                                        key={member.member_name}
                                        member={member}
                                        dates={timelineDates}
                                        today={today}
                                        onOpenDetail={() => setDetailMemberName(member.member_name)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </AppShell>

            <ScheduleEntryModal
                isOpen={isEntryModalOpen}
                members={store.members}
                onClose={() => setIsEntryModalOpen(false)}
                onSubmit={handleSubmitEntry}
            />

            <MemberScheduleDetailModal
                isOpen={Boolean(detailMemberName)}
                memberName={detailMemberName}
                onClose={() => setDetailMemberName(null)}
            />
        </>
    );
}

function FragmentRow({
    member,
    dates,
    today,
    onOpenDetail,
}: {
    member: MemberSchedule;
    dates: string[];
    today: string;
    onOpenDetail: () => void;
}) {
    return (
        <>
            <button
                type="button"
                onClick={onOpenDetail}
                className="sticky left-0 z-10 rounded-2xl bg-white px-3 py-4 text-left transition hover:bg-slate-50"
            >
                <div className="font-bold text-slate-900">{member.member_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                    {member.weekdays.length > 0 ? member.weekdays.join("・") : "曜日未設定"} / {member.work_style}
                </div>
            </button>

            {dates.map((date, index) => {
                const current = getDateStatus(member, date);
                const prev = index > 0 ? getDateStatus(member, dates[index - 1]) : null;
                const next = index < dates.length - 1 ? getDateStatus(member, dates[index + 1]) : null;
                const isToday = date === today;

                return (
                    <div
                        key={`${member.member_name}-${date}`}
                        className={`rounded-2xl px-1 py-3 ${isToday ? "bg-amber-50" : "bg-white"}`}
                    >
                        {current ? (
                            <button
                                type="button"
                                onClick={onOpenDetail}
                                title={getTypeLabel(current)}
                                className={`flex h-8 w-full items-center justify-center text-xs font-bold ${getCellClasses(
                                    current,
                                    prev,
                                    next,
                                )}`}
                            >
                                {current === "available" ? "⭕️" : "❌"}
                            </button>
                        ) : (
                            <div className="h-8 w-full rounded-full bg-slate-100" />
                        )}
                    </div>
                );
            })}
        </>
    );
}