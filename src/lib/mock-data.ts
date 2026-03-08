// Utility to convert mg/dL to mmol/L
export function mgToMmol(mgdl: number): number {
  return Math.round((mgdl / 18.0182) * 10) / 10;
}

// mmol/L range thresholds
// Urgent Low: < 3.0, Low: 3.0–3.9, In Range: 3.9–10.0, High: 10.0–13.9, Urgent High: > 13.9

export type GlucoseStatus = "URGENT LOW" | "LOW" | "IN RANGE" | "HIGH" | "URGENT HIGH";

export function getGlucoseStatus(mgdl: number): GlucoseStatus {
  const mmol = mgToMmol(mgdl);
  if (mmol < 3.0) return "URGENT LOW";
  if (mmol < 3.9) return "LOW";
  if (mmol <= 10.0) return "IN RANGE";
  if (mmol <= 13.9) return "HIGH";
  return "URGENT HIGH";
}

export function getGlucoseColorClass(mgdl: number): string {
  const mmol = mgToMmol(mgdl);
  if (mmol < 3.0) return "text-glucose-urgent-low";
  if (mmol < 3.9) return "text-glucose-low";
  if (mmol <= 10.0) return "text-glucose-in-range";
  if (mmol <= 13.9) return "text-glucose-high";
  return "text-glucose-urgent-high";
}

export function getGlucoseBgClass(mgdl: number): string {
  const mmol = mgToMmol(mgdl);
  if (mmol < 3.0) return "bg-glucose-urgent-low";
  if (mmol < 3.9) return "bg-glucose-low";
  if (mmol <= 10.0) return "bg-glucose-in-range";
  if (mmol <= 13.9) return "bg-glucose-high";
  return "bg-glucose-urgent-high";
}

export function getGlucoseHex(mgdl: number): string {
  const mmol = mgToMmol(mgdl);
  if (mmol < 3.0) return "#ef4444";
  if (mmol < 3.9) return "#ef4444";
  if (mmol <= 10.0) return "#22c55e";
  if (mmol <= 13.9) return "#f59e0b";
  return "#f97316";
}

export function getTrendArrow(trend: string): string {
  const arrows: Record<string, string> = {
    doubleUp: "⇈",
    singleUp: "↑",
    fortyFiveUp: "↗",
    flat: "→",
    fortyFiveDown: "↘",
    singleDown: "↓",
    doubleDown: "⇊",
    none: "—",
  };
  return arrows[trend] || "—";
}

export function getTrendLabel(trend: string): string {
  const labels: Record<string, string> = {
    doubleUp: "Rising rapidly",
    singleUp: "Rising",
    fortyFiveUp: "Rising slowly",
    flat: "Stable",
    fortyFiveDown: "Falling slowly",
    singleDown: "Falling",
    doubleDown: "Falling rapidly",
    none: "Unknown",
  };
  return labels[trend] || "Unknown";
}

export interface EGVReading {
  timestamp: string;
  value: number; // mg/dL from Dexcom
  trend: string;
  trendRate: number;
}

export interface DexcomEvent {
  timestamp: string;
  type: "carbs" | "insulin" | "exercise";
  value?: number;
  duration?: number;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  dob: string;
  relationship: string;
  connected: boolean;
}

// Generate realistic CGM data for past N hours
export function generateMockEGVs(hours: number = 24): EGVReading[] {
  const readings: EGVReading[] = [];
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const interval = 5;

  let value = 120;

  for (let t = start.getTime(); t <= now.getTime(); t += interval * 60 * 1000) {
    const hourOfDay = new Date(t).getHours();
    let drift = (Math.random() - 0.5) * 8;

    if (hourOfDay >= 4 && hourOfDay <= 8) drift += 1.5;
    if (hourOfDay >= 7 && hourOfDay <= 9) drift += 2;
    if (hourOfDay >= 12 && hourOfDay <= 14) drift += 2.5;
    if (hourOfDay >= 18 && hourOfDay <= 20) drift += 2;
    if (hourOfDay >= 23 || hourOfDay <= 3) drift *= 0.3;

    value = Math.max(45, Math.min(350, value + drift));

    const trendRate = drift / interval;
    let trend = "flat";
    if (trendRate > 2) trend = "doubleUp";
    else if (trendRate > 1) trend = "singleUp";
    else if (trendRate > 0.3) trend = "fortyFiveUp";
    else if (trendRate < -2) trend = "doubleDown";
    else if (trendRate < -1) trend = "singleDown";
    else if (trendRate < -0.3) trend = "fortyFiveDown";

    readings.push({
      timestamp: new Date(t).toISOString(),
      value: Math.round(value),
      trend,
      trendRate: Math.round(trendRate * 10) / 10,
    });
  }

  return readings;
}

export function generateMockEvents(hours: number = 24): DexcomEvent[] {
  const events: DexcomEvent[] = [];
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const mealTimes = [8, 12.5, 19];
  mealTimes.forEach((hour) => {
    const mealTime = new Date(start);
    mealTime.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
    if (mealTime >= start && mealTime <= now) {
      events.push({
        timestamp: mealTime.toISOString(),
        type: "carbs",
        value: Math.round(30 + Math.random() * 50),
      });
      events.push({
        timestamp: new Date(mealTime.getTime() - 5 * 60000).toISOString(),
        type: "insulin",
        value: Math.round((3 + Math.random() * 5) * 10) / 10,
      });
    }
  });

  const exerciseTime = new Date(start);
  exerciseTime.setHours(16, 30, 0, 0);
  if (exerciseTime >= start && exerciseTime <= now) {
    events.push({
      timestamp: exerciseTime.toISOString(),
      type: "exercise",
      duration: 45,
    });
  }

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export const mockMembers: Member[] = [
  { id: "1", name: "Alex", avatar: "A", dob: "2012-05-15", relationship: "Son", connected: true },
  { id: "2", name: "Maya", avatar: "M", dob: "2009-11-22", relationship: "Daughter", connected: true },
];

const memberDataCache: Record<string, { egvs: EGVReading[]; events: DexcomEvent[] }> = {};

export function getMemberData(memberId: string) {
  if (!memberDataCache[memberId]) {
    memberDataCache[memberId] = {
      egvs: generateMockEGVs(24),
      events: generateMockEvents(24),
    };
  }
  return memberDataCache[memberId];
}

export function calculateStats(egvs: EGVReading[], hours: number = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const filtered = egvs.filter((r) => new Date(r.timestamp) >= cutoff);
  if (filtered.length === 0) return { tir: 0, high: 0, low: 0, avg: 0, readings: 0 };

  // Use mmol/L thresholds: 3.9–10.0
  const inRange = filtered.filter((r) => mgToMmol(r.value) >= 3.9 && mgToMmol(r.value) <= 10.0).length;
  const high = filtered.filter((r) => mgToMmol(r.value) > 10.0).length;
  const low = filtered.filter((r) => mgToMmol(r.value) < 3.9).length;
  const avgMmol = Math.round((filtered.reduce((s, r) => s + mgToMmol(r.value), 0) / filtered.length) * 10) / 10;

  return {
    tir: Math.round((inRange / filtered.length) * 100),
    high: Math.round((high / filtered.length) * 100),
    low: Math.round((low / filtered.length) * 100),
    avg: avgMmol,
    readings: filtered.length,
  };
}
