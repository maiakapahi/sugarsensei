import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchDexcomData, startDexcomOAuth } from "@/lib/api";
import { familyListPath } from "@/lib/authed-routes";
import { usePortfolioDemo } from "@/context/PortfolioDemoContext";
import { mockMembers } from "@/lib/mock-data";
import { GlucoseChart } from "@/components/GlucoseChart";
import { StatsBar } from "@/components/StatsBar";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw, MessageCircle, X, Activity, UtensilsCrossed } from "lucide-react";
import {
  EGVReading, DexcomEvent, getGlucoseStatus, getGlucoseColorClass,
  getTrendArrow, getTrendLabel, calculateStats, generateMockEGVs, generateMockEvents,
  mgToMmol,
} from "@/lib/mock-data";

export default function MemberDashboard() {
  const isDemo = usePortfolioDemo();
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [memberName, setMemberName] = useState("");
  const [egvs, setEgvs] = useState<EGVReading[]>([]);
  const [events, setEvents] = useState<DexcomEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    if (memberId) loadData();
  }, [memberId, isDemo]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!memberId || needsAuth || isDemo) return;
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [memberId, needsAuth, isDemo]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    const fetchHours = 168; // 7 days
    if (isDemo) {
      setEgvs(generateMockEGVs(fetchHours));
      setEvents(generateMockEvents(fetchHours));
      setMemberName(mockMembers.find((m) => m.id === memberId)?.name || "Member");
      setNeedsAuth(false);
      setUseMock(true);
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }
    try {
      const result = await fetchDexcomData(memberId!, fetchHours);
      if (result.needsAuth) {
        setNeedsAuth(true);
        setEgvs(generateMockEGVs(fetchHours));
        setEvents(generateMockEvents(fetchHours));
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
      setEgvs(generateMockEGVs(fetchHours));
      setEvents(generateMockEvents(fetchHours));
      setUseMock(true);
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
          <Button variant="ghost" size="sm" onClick={() => navigate(`${familyListPath(isDemo)}?skipAutoOpen=1`)}>
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

      <Tabs
        value="bg-insights"
        onValueChange={(value) => {
          if (value === "carb-counter") {
            navigate(`${familyListPath(isDemo)}?tab=carb-counter&skipAutoOpen=1`);
          }
        }}
        className="w-full"
      >
        <div className="border-b border-border">
          <TabsList className="w-full max-w-2xl mx-auto h-12 bg-transparent rounded-none p-0 gap-0">
            <TabsTrigger
              value="bg-insights"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <Activity className="h-4 w-4" />
              BG Insights
            </TabsTrigger>
            <TabsTrigger
              value="carb-counter"
              className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-2"
            >
              <UtensilsCrossed className="h-4 w-4" />
              Carb Counter
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

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

        {needsAuth && !isDemo && (
          <div className="bg-glucose-high/10 border border-glucose-high/20 rounded-lg p-4 text-center">
            <p className="text-sm text-foreground mb-2">Dexcom needs to be connected or re-authorized</p>
            <Button size="sm" onClick={() => startDexcomOAuth(memberId!)}>
              Connect Dexcom
            </Button>
          </div>
        )}

        <StatsBar {...stats} />
        <GlucoseChart egvs={egvs} events={events} />
      </main>

      {/* Floating chat button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Slide-in chat panel */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-card border-l border-border shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">🤖 AI Coach</h3>
            <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIChatPanel cgmContext={cgmContext} />
          </div>
        </div>
      )}
    </div>
  );
}
