export function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  const color =
    value >= 4
      ? "bg-brand-green"
      : value < 3
        ? "bg-brand-orange"
        : "bg-brand-orange-light";

  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-medium text-brand-gray-500 shrink-0">
        {label}
      </span>
      <div className="h-2 flex-1 rounded-full bg-brand-gray-200">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium text-brand-charcoal">
        {value}
      </span>
    </div>
  );
}
