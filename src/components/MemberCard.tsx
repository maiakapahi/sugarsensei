import { useNavigate } from "react-router-dom";
import { Member, getMemberData, getGlucoseStatus, getGlucoseColorClass, getGlucoseBgClass, getTrendArrow, getTrendLabel, mgToMmol } from "@/lib/mock-data";

interface MemberCardProps {
  member: Member;
}

export function MemberCard({ member }: MemberCardProps) {
  const navigate = useNavigate();
  const data = getMemberData(member.id);
  const latest = data.egvs[data.egvs.length - 1];
  const status = getGlucoseStatus(latest.value);
  const colorClass = getGlucoseColorClass(latest.value);
  const bgClass = getGlucoseBgClass(latest.value);
  const arrow = getTrendArrow(latest.trend);
  const trendLabel = getTrendLabel(latest.trend);

  const lastUpdated = new Date(latest.timestamp);
  const minutesAgo = Math.round((Date.now() - lastUpdated.getTime()) / 60000);

  return (
    <button
      onClick={() => navigate(`/member/${member.id}`)}
      className="w-full rounded-lg bg-card border border-border p-5 text-left transition-all hover:bg-surface-2 hover:border-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-surface-2 flex items-center justify-center text-sm font-semibold text-foreground">
          {member.avatar}
        </div>
        <div>
          <p className="font-semibold text-foreground">{member.name}</p>
          <p className="text-xs text-muted-foreground">{member.relationship}</p>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-5xl font-extrabold tracking-tight ${colorClass}`}>
          {mgToMmol(latest.value)}
        </span>
        <span className={`text-2xl ${colorClass}`}>{arrow}</span>
        <span className="text-sm text-muted-foreground ml-1">mmol/L</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-foreground/90 ${bgClass}/20 border ${bgClass === 'bg-glucose-in-range' ? 'border-glucose-in-range/30' : bgClass === 'bg-glucose-high' ? 'border-glucose-high/30' : bgClass === 'bg-glucose-urgent-high' ? 'border-glucose-urgent-high/30' : 'border-glucose-low/30'}`}>
          {status}
        </span>
        <span className="text-xs text-muted-foreground">{trendLabel}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {minutesAgo <= 1 ? "Just now" : `${minutesAgo} min ago`}
      </p>
    </button>
  );
}
