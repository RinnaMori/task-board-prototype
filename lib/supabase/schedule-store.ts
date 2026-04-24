"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import { createEmptyMemberSchedule, sortScheduleRanges } from "@/lib/schedule-utils";
import type { MemberSchedule, ScheduleRange, ScheduleStore } from "@/types/schedule";

type ScheduleRow = {
    id: string;
    member_name: string;
    type: "available" | "unavailable";
    start_date: string;
    end_date: string;
    weekdays: string[] | null;
    work_style: string | null;
    created_at?: string;
};

type MemberRow = {
    member_name: string;
};

export async function fetchActiveMemberNames(): Promise<string[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("members")
        .select("member_name")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return ((data ?? []) as MemberRow[]).map((row) => row.member_name);
}

export async function fetchSupabaseScheduleStore(memberNames: string[]): Promise<ScheduleStore> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from("schedules")
        .select("id, member_name, type, start_date, end_date, weekdays, work_style, created_at")
        .order("created_at", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    const rows = (data ?? []) as ScheduleRow[];
    const rowMap = new Map<string, ScheduleRow[]>();

    rows.forEach((row) => {
        const current = rowMap.get(row.member_name) ?? [];
        current.push(row);
        rowMap.set(row.member_name, current);
    });

    const members: MemberSchedule[] = memberNames.map((memberName) => {
        const memberRows = rowMap.get(memberName) ?? [];
        if (memberRows.length === 0) {
            return createEmptyMemberSchedule(memberName);
        }

        const firstRow = memberRows[0];
        const schedules: ScheduleRange[] = sortScheduleRanges(
            memberRows.map((row) => ({
                id: row.id,
                type: row.type,
                start_date: row.start_date,
                end_date: row.end_date,
            })),
        );

        return {
            member_name: memberName,
            weekdays: Array.isArray(firstRow.weekdays)
                ? (firstRow.weekdays as MemberSchedule["weekdays"])
                : [],
            work_style: (firstRow.work_style as MemberSchedule["work_style"]) ?? "どちらも可",
            schedules,
        };
    });

    return { members };
}

export async function fetchSupabaseScheduleStoreForActiveMembers(): Promise<ScheduleStore> {
    const memberNames = await fetchActiveMemberNames();
    return fetchSupabaseScheduleStore(memberNames);
}

export async function insertSupabaseScheduleEntry(input: {
    member_name: string;
    weekdays: MemberSchedule["weekdays"];
    work_style: MemberSchedule["work_style"];
    range: MemberSchedule["schedules"][number];
}) {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("schedules").insert({
        member_name: input.member_name,
        type: input.range.type,
        start_date: input.range.start_date,
        end_date: input.range.end_date,
        weekdays: input.weekdays,
        work_style: input.work_style,
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function updateSupabaseScheduleEntry(input: {
    member_name: string;
    weekdays: MemberSchedule["weekdays"];
    work_style: MemberSchedule["work_style"];
    range: MemberSchedule["schedules"][number];
}) {
    if (!input.range.id) {
        throw new Error("更新対象の schedule id がありません");
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from("schedules")
        .update({
            member_name: input.member_name,
            type: input.range.type,
            start_date: input.range.start_date,
            end_date: input.range.end_date,
            weekdays: input.weekdays,
            work_style: input.work_style,
        })
        .eq("id", input.range.id);

    if (error) {
        throw new Error(error.message);
    }
}