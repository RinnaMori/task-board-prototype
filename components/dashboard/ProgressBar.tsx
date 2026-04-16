type ProgressBarProps = {
    value: number;
    colorClass?: string;
};

export function ProgressBar({
    value,
    colorClass = "bg-sky-500",
}: ProgressBarProps) {
    const safeValue = Math.max(0, Math.min(100, value));

    return (
        <div className="h-3 w-full rounded-full bg-slate-200">
            <div
                className={`h-3 rounded-full transition-all duration-300 ${colorClass}`}
                style={{ width: `${safeValue}%` }}
            />
        </div>
    );
}