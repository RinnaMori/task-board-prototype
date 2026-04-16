type DashboardHeaderProps = {
    selectedRange: string;
    onChangeRange: (value: string) => void;
    onOpenTaskModal: () => void;

    filterStatus: string;
    onChangeStatus: (value: string) => void;

    search: string;
    onChangeSearch: (value: string) => void;
};

export function DashboardHeader({
    selectedRange,
    onChangeRange,
    onOpenTaskModal,
    filterStatus,
    onChangeStatus,
    search,
    onChangeSearch,
}: DashboardHeaderProps) {
    return (
        <header className="rounded-[28px] border bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold">
                        人材・タスク管理ボード
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* 検索 */}
                    <input
                        value={search}
                        onChange={(e) => onChangeSearch(e.target.value)}
                        placeholder="タスク検索"
                        className="rounded-xl border px-3 py-2 text-sm"
                    />

                    {/* ステータスフィルター */}
                    <select
                        value={filterStatus}
                        onChange={(e) => onChangeStatus(e.target.value)}
                        className="rounded-xl border px-3 py-2 text-sm"
                    >
                        <option value="all">すべて</option>
                        <option value="未着手">未着手</option>
                        <option value="進行中">進行中</option>
                        <option value="完了">完了</option>
                        <option value="保留">保留</option>
                    </select>

                    <button
                        onClick={onOpenTaskModal}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white"
                    >
                        ＋ タスク
                    </button>
                </div>
            </div>
        </header>
    );
}