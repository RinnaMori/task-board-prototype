export type ScheduleType = "available" | "unavailable";

export type WorkStyle = "オフィス" | "リモート" | "どちらも可";

export type Weekday = "月" | "火" | "水" | "木" | "金" | "土" | "日";

export type ScheduleRange = {
    id: string;
    start_date: string;
    end_date: string;
    type: ScheduleType;
};

export type MemberSchedule = {
    member_name: string;
    weekdays: Weekday[];
    work_style: WorkStyle;
    schedules: ScheduleRange[];
};

export type ScheduleStore = {
    members: MemberSchedule[];
};