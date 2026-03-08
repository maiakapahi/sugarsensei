interface StatsBarProps {
  tir: number;
  high: number;
  low: number;
  avg: number;
  readings: number;
}

export function StatsBar({ tir, high, low, avg, readings }: StatsBarProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="grid grid-cols-5 gap-3">
        <StatItem
          label="Time in Range"
          value={`${tir}%`}
          color="text-glucose-in-range"
          bar={{ value: tir, color: "bg-glucose-in-range" }}
        />
        <StatItem label="Time High" value={`${high}%`} color="text-glucose-high" />
        <StatItem label="Time Low" value={`${low}%`} color="text-glucose-low" />
        <StatItem label="Average" value={`${avg}`} sub="mg/dL" />
        <StatItem label="Readings" value={`${readings}`} />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  sub,
  color,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bar?: { value: number; color: string };
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${color || "text-foreground"}`}>
        {value}
        {sub && <span className="text-xs font-normal text-muted-foreground ml-0.5">{sub}</span>}
      </p>
      {bar && (
        <div className="mt-1.5 h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${bar.color}`}
            style={{ width: `${bar.value}%` }}
          />
        </div>
      )}
    </div>
  );
}
