import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchDexcomData, startDexcomOAuth } from "@/lib/api";
import { GlucoseChart } from "@/components/GlucoseChart";
import { StatsBar } from "@/components/StatsBar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, MessageCircle, X } from "lucide-react";
import {
  EGVReading, DexcomEvent, getGlucoseStatus, getGlucoseColorClass,
  getTrendArrow, getTrendLabel, calculateStats, generateMockEGVs, generateMockEvents,
  mgToMmol,
} from "@/lib/mock-data";

export default function MemberDashboard() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [memberName, setMemberName] = useState("");
  const [egvs, setEgvs] = useState<EGVReading[]>([]);
  const [events, setEvents] = useState<DexcomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (memberId) loadData();
  }, [memberId]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!memberId || needsAuth) return;
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [memberId, needsAuth]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const result = await fetchDexcomData(memberId!, 24);
      if (result.needsAuth) {
        setNeedsAuth(true);
        // Fall back to mock data for demo
        setEgvs(generateMockEGVs(24));
        setEvents(generateMockEvents(24));
        setUseMock(true);
        setMemberName(result.memberName || "Member");
      } else {
        setEgvs(result.egvs || []);
        setEvents(result.events || []);
        setMemberName(result.memberName || "Member");
        setNeedsAuth(false);
        setUseMock(false);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      // Fall back to mock for demo
      setEgvs(generateMockEGVs(24));
      setEvents(generateMockEvents(24));
      setUseMock(true);
      // Try to get member name
      const { data: member } = await supabase
        .from("members")
        .select("name")
        .eq("id", memberId!)
        .single();
      setMemberName(member?.name || "Member");
    } finally {
      setLoading(false);
    }
  }

  const latest = egvs.length > 0 ? egvs[egvs.length - 1] : null;
  const stats = calculateStats(egvs, 24);

  // Build CGM context for AI
  const cgmContext = latest ? `
Current BG: ${mgToMmol(latest.value)} mmol/L
Trend: ${getTrendLabel(latest.trend)} (${Math.round(mgToMmol(latest.trendRate) * 10) / 10} mmol/L/min)
Status: ${getGlucoseStatus(latest.value)}
Time in Range (3.9–10.0): ${stats.tir}%
Time High: ${stats.high}%
Time Low: ${stats.low}%
Average BG: ${stats.avg} mmol/L
Readings in last 24h: ${stats.readings}
Recent events: ${events.map(e =>
  e.type === "carbs" ? `${e.value}g carbs` :
  e.type === "insulin" ? `${e.value}u insulin` :
  `${e.duration}min exercise`
).join(", ") || "None"}
Last 6 readings: ${egvs.slice(-6).map(r => `${mgToMmol(r.value)} (${getTrendArrow(r.trend)})`).join(", ")}
  `.trim() : "No CGM data available.";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse-glow text-4xl mb-4">📊</div>
          <p className="text-muted-foreground">Loading glucose data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{memberName}</h1>
          {useMock && (
            <span className="text-[10px] bg-glucose-high/20 text-glucose-high px-2 py-0.5 rounded-full font-medium">
              DEMO DATA
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {Math.round((Date.now() - lastUpdated.getTime()) / 60000)}m ago
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Current BG hero */}
        {latest && (
          <div className="text-center py-4">
            <span className={`text-7xl font-black tracking-tighter ${getGlucoseColorClass(latest.value)}`}>
              {mgToMmol(latest.value)}
            </span>
            <span className={`text-3xl ml-2 ${getGlucoseColorClass(latest.value)}`}>
              {getTrendArrow(latest.trend)}
            </span>
            <p className="text-sm text-muted-foreground mt-1">
              {getTrendLabel(latest.trend)} · mmol/L
            </p>
          </div>
        )}

        {needsAuth && (
          <div className="bg-glucose-high/10 border border-glucose-high/20 rounded-lg p-4 text-center">
            <p className="text-sm text-foreground mb-2">Dexcom needs to be connected or re-authorized</p>
            <Button size="sm" onClick={() => startDexcomOAuth(memberId!)}>
              Connect Dexcom
            </Button>
          </div>
        )}

        <StatsBar {...stats} />
        <GlucoseChart egvs={egvs} events={events} />
        <AIChatPanel cgmContext={cgmContext} />
      </main>
    </div>
  );
}
