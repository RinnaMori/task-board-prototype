"use client";

import { defaultScheduleStore } from "@/data/schedule-mock";
import type {
    MemberSchedule,
    ScheduleRange,
    ScheduleStore,
    ScheduleType,
    Weekday,
    WorkStyle,
} from "@/types/schedule";

export const SCHEDULE_STORAGE_KEY = "task-dashboard-schedule-store-v1";

export const WEEKDAY_OPTIONS: Weekday[] = ["月", "火", "水", "木", "金", "土", "日"];
export const WORK_STYLE_OPTIONS: WorkStyle[] = ["オフィス", "リモート", "どちらも可"];

export function normalizeDate(value: string) {
    return value.slice(0, 10);
}

export function formatDateToYmd(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

export function getTodayDateString() {
    return formatDateToYmd(new Date());
}

export function buildTimelineDates(days = 14, startOffset = -3) {
    const start = addDays(new Date(), startOffset);
    return Array.from({ length: days }, (_, index) => formatDateToYmd(addDays(start, index)));
}

export function getWeekdayLabel(ymd: string) {
    const date = new Date(ymd);
    const labels: Weekday[] = ["日", "月", "火", "水", "木", "金", "土"];
    return labels[date.getDay()];
}

export function isDateInRange(targetDate: string, range: ScheduleRange) {
    const target = normalizeDate(targetDate);
    const start = normalizeDate(range.start_date);
    const end = normalizeDate(range.end_date);
    return start <= target && target <= end;
}

export function getDateStatus(member: MemberSchedule, targetDate: string): ScheduleType | null {
    const unavailable = member.schedules.find(
        (schedule) => schedule.type === "unavailable" && isDateInRange(targetDate, schedule),
    );
    if (unavailable) return "unavailable";

    const available = member.schedules.find(
        (schedule) => schedule.type === "available" && isDateInRange(targetDate, schedule),
    );
    if (available) return "available";

    return null;
}

export function getTodayStatus(memberName: string, members: MemberSchedule[]): ScheduleType | null {
    const member = members.find((item) => item.member_name === memberName);
    if (!member) return null;
    return getDateStatus(member, getTodayDateString());
}

export function getTypeLabel(type: ScheduleType) {
    return type === "available" ? "⭕️ 稼働可能" : "❌ 忙しい / 稼働不可";
}

export function getScheduleTypeLabel(type: ScheduleType) {
    return getTypeLabel(type);
}

export function createEmptyMemberSchedule(memberName: string): MemberSchedule {
    return {
        member_name: memberName,
        weekdays: [],
        work_style: "どちらも可",
        schedules: [],
    };
}

export function sortScheduleRanges(ranges: ScheduleRange[]) {
    return [...ranges].sort((a, b) => {
        if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
        return a.end_date.localeCompare(b.end_date);
    });
}

export function loadScheduleStore(): ScheduleStore {
    if (typeof window === "undefined") return defaultScheduleStore;

    const raw = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
        return defaultScheduleStore;
    }

    try {
        const parsed = JSON.parse(raw) as ScheduleStore;
        if (!parsed || !Array.isArray(parsed.members)) return defaultScheduleStore;
        return parsed;
    } catch {
        return defaultScheduleStore;
    }
}

export function saveScheduleStore(store: ScheduleStore) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("schedule-store-updated"));
}