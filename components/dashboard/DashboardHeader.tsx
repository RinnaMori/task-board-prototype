import type { TaskStatus } from "@/types/dashboard";

type DashboardHeaderProps = {
    search: string;
    onChangeSearch: (value: string) => void;
    filterStatus: TaskStatus | "all";
    onChangeStatus: (value: TaskStatus | "all") => void;
    onOpenTaskModal: () => void;
    onOpenMemberModal: () => void;
    onOpenProjectModal: () => void;
    onReset: () => void;
};

export function DashboardHeader({
    search,
    onChangeSearch,
    filterStatus,
    onChangeStatus,
    onOpenTaskModal,
    onOpenMemberModal,
    onOpenProjectModal,
    onReset,
}: DashboardHeaderProps) {
    return (
        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="grid gap-3 md:grid-cols-3 xl:flex xl:flex-wrap">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => onChangeSearch(event.target.value)}
                        placeholder="タスク名 / プロジェクト名 / 担当者で検索"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-400 md:min-w-[300px]"
                    />

                    <select
                        value={filterStatus}
                        onChange={(event) => onChangeStatus(event.target.value as TaskStatus | "all")}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
                    >
                        <option value="all">全ステータス</option>
                        <option value="未着手">未着手</option>
                        <option value="進行中">進行中</option>
                        <option value="完了">完了</option>
                        <option value="保留">保留</option>
                    </select>

                    <button
                        type="button"
                        onClick={onReset}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        初期データに戻す
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={onOpenMemberModal}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        ＋ メンバー追加
                    </button>
                    <button
                        type="button"
                        onClick={onOpenProjectModal}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        ＋ プロジェクト追加
                    </button>
                    <button
                        type="button"
                        onClick={onOpenTaskModal}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700"
                    >
                        ＋ タスク追加
                    </button>
                </div>
            </div>
        </section>
    );
}