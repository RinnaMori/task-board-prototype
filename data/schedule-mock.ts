import { addDays, formatDateToYmd } from "@/lib/schedule-utils";
import type { ScheduleStore } from "@/types/schedule";

const today = new Date();

export const defaultScheduleStore: ScheduleStore = {
    members: [
        {
            member_name: "マネージャー 山本",
            weekdays: ["月", "火", "水", "木", "金"],
            work_style: "どちらも可",
            schedules: [],
        },
        {
            member_name: "リーダー 田中",
            weekdays: ["月", "火", "水", "木", "金"],
            work_style: "オフィス",
            schedules: [
                {
                    id: "sched-001",
                    start_date: formatDateToYmd(addDays(today, -1)),
                    end_date: formatDateToYmd(addDays(today, 2)),
                    type: "available",
                },
            ],
        },
        {
            member_name: "正社員 花子",
            weekdays: ["月", "火", "水", "木", "金"],
            work_style: "どちらも可",
            schedules: [
                {
                    id: "sched-002",
                    start_date: formatDateToYmd(addDays(today, 1)),
                    end_date: formatDateToYmd(addDays(today, 4)),
                    type: "available",
                },
            ],
        },
        {
            member_name: "インターン A",
            weekdays: ["月", "水", "金"],
            work_style: "リモート",
            schedules: [
                {
                    id: "sched-003",
                    start_date: formatDateToYmd(addDays(today, -2)),
                    end_date: formatDateToYmd(addDays(today, 1)),
                    type: "available",
                },
                {
                    id: "sched-004",
                    start_date: formatDateToYmd(addDays(today, 3)),
                    end_date: formatDateToYmd(addDays(today, 5)),
                    type: "unavailable",
                },
            ],
        },
        {
            member_name: "インターン B",
            weekdays: ["火", "木"],
            work_style: "オフィス",
            schedules: [
                {
                    id: "sched-005",
                    start_date: formatDateToYmd(addDays(today, -1)),
                    end_date: formatDateToYmd(addDays(today, 1)),
                    type: "unavailable",
                },
            ],
        },
        {
            member_name: "インターン C",
            weekdays: ["月", "木", "金"],
            work_style: "どちらも可",
            schedules: [
                {
                    id: "sched-006",
                    start_date: formatDateToYmd(addDays(today, 2)),
                    end_date: formatDateToYmd(addDays(today, 6)),
                    type: "available",
                },
            ],
        },
    ],
};