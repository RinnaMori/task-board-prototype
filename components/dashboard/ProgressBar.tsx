type ProgressBarProps = {
    value: number;
    colorClass?: string;
};

export function ProgressBar({ value, colorClass = "bg-slate-900" }: ProgressBarProps) {
    const safeValue = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

    return (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
                className={`h-full rounded-full transition-all ${colorClass}`}
                style={{ width: `${safeValue}%` }}
            />
        </div>
    );
}