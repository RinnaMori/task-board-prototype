import { getSupabaseClient } from "@/lib/supabase/client";

export function subscribeToTasks(onChange: () => void) {
    const supabase = getSupabaseClient();

    return supabase
        .channel("tasks-realtime")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "tasks" },
            () => {
                onChange();
            },
        )
        .subscribe();
}

