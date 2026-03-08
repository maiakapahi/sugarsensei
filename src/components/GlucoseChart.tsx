import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, Scatter, ScatterChart, ComposedChart,
} from "recharts";
import { EGVReading, DexcomEvent, getGlucoseHex, mgToMmol } from "@/lib/mock-data";
import { format } from "date-fns";

interface GlucoseChartProps {
  egvs: EGVReading[];
  events: DexcomEvent[];
}

const timeRanges = [
  { label: "3hr", hours: 3 },
  { label: "6hr", hours: 6 },
  { label: "12hr", hours: 12 },
  { label: "24hr", hours: 24 },
  { label: "3d", hours: 72 },
  { label: "7d", hours: 168 },
];

export function GlucoseChart({ egvs, events }: GlucoseChartProps) {
  const [hours, setHours] = useState<number>(6);

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const filtered = egvs.filter((r) => new Date(r.timestamp) >= cutoff);
  const filteredEvents = events.filter((e) => new Date(e.timestamp) >= cutoff);

  // Build chart data with glucose values in mmol/L
  const chartData = filtered.map((r) => ({
    time: new Date(r.timestamp).getTime(),
    value: mgToMmol(r.value),
    color: getGlucoseHex(r.value),
  }));

  // Build event markers
  const eventMarkers = filteredEvents.map((e) => {
    const closestReading = filtered.reduce((prev, curr) =>
      Math.abs(new Date(curr.timestamp).getTime() - new Date(e.timestamp).getTime()) <
      Math.abs(new Date(prev.timestamp).getTime() - new Date(e.timestamp).getTime())
        ? curr : prev
    );
    return {
      time: new Date(e.timestamp).getTime(),
      value: mgToMmol(closestReading?.value || 150),
      type: e.type,
      amount: e.value,
      duration: e.duration,
    };
  });

  const eventIcon = (type: string) => {
    if (type === "carbs") return "🍴";
    if (type === "insulin") return "💉";
    if (type === "exercise") return "🏃";
    return "";
  };

  // Custom dot that colors by glucose value
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return <circle cx={cx} cy={cy} r={1.5} fill={payload.color} stroke="none" />;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm shadow-lg">
        <p className="font-semibold" style={{ color: data.color }}>
          {data.value} mmol/L
        </p>
        <p className="text-muted-foreground text-xs">
          {format(new Date(data.time), "h:mm a")}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Time range toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Glucose</h3>
        <div className="flex gap-1 bg-surface-2 rounded-md p-0.5">
          {timeRanges.map((t) => (
            <button
              key={t}
              onClick={() => setHours(t)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                hours === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}hr
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => format(new Date(t), "h:mm a")}
              stroke="hsl(0 0% 35%)"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[2, 20]}
              stroke="hsl(0 0% 35%)"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={3.9} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine y={10.0} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />

            {/* Shaded in-range zone */}
            <defs>
              <linearGradient id="rangeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <Line
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: "#22c55e", stroke: "hsl(0 0% 10%)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Event markers legend */}
      {eventMarkers.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border">
          {filteredEvents.map((e, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{eventIcon(e.type)}</span>
              <span>
                {e.type === "carbs" && `${e.value}g carbs`}
                {e.type === "insulin" && `${e.value}u insulin`}
                {e.type === "exercise" && `${e.duration}min exercise`}
              </span>
              <span className="text-muted-foreground/50">
                {format(new Date(e.timestamp), "h:mm a")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
