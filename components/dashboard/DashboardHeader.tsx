type DashboardHeaderProps = {
    selectedRange: string;
    onChangeRange: (value: string) => void;
    onOpenProjectModal: () => void;
    onOpenTaskModal: () => void;
    onOpenMemberModal: () => void;
    filterStatus: string;
    onChangeStatus: (value: string) => void;
    search: string;
    onChangeSearch: (value: string) => void;
};

export function DashboardHeader({
    selectedRange,
    onChangeRange,
    onOpenTaskModal,
    onOpenMemberModal,
    onOpenProjectModal,
    filterStatus,
    onChangeStatus,
    search,
    onChangeSearch,
}: DashboardHeaderProps) {
    return (
        <header className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                        人材・タスク管理ボード
                    </h1>
                    <p className="mt-1.5 text-sm font-medium text-slate-500 md:text-base">
                        担当者ごとのキャパシティとタスクを一目で把握できます
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        placeholder="タスク名で検索"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
                    />

                    <select
                        value={filterStatus}
                        onChange={(e) => onChangeStatus(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
                    >
                        <option value="all">すべて</option>
                        <option value="未着手">未着手</option>
                        <option value="進行中">進行中</option>
                        <option value="完了">完了</option>
                        <option value="保留">保留</option>
                    </select>

                    <select
                        value={selectedRange}
                        onChange={(event) => onChangeRange(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
                    >
                        <option value="今週">今週</option>
                        <option value="今月">今月</option>
                        <option value="四半期">四半期</option>
                    </select>

                    <button
                        type="button"
                        onClick={onOpenMemberModal}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        ＋ メンバー追加
                    </button>

                    <button
                        type="button"
                        onClick={onOpenTaskModal}
                        className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700"
                    >
                        ＋ タスク追加
                    </button>

                    <button
                        onClick={onOpenProjectModal}
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-100"
                    >
                        ＋ プロジェクト追加
                    </button> 
                </div>
            </div>
        </header>
    );
}