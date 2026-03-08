// Mock Dexcom CGM data for development

export interface EGVReading {
  timestamp: string;
  value: number; // mg/dL
  trend: string;
  trendRate: number; // mg/dL per minute
}

export interface DexcomEvent {
  timestamp: string;
  type: "carbs" | "insulin" | "exercise";
  value?: number; // grams for carbs, units for insulin
  duration?: number; // minutes for exercise
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  dob: string;
  relationship: string;
  connected: boolean;
}

export type GlucoseStatus = "URGENT LOW" | "LOW" | "IN RANGE" | "HIGH" | "URGENT HIGH";

export function getGlucoseStatus(value: number): GlucoseStatus {
  if (value < 55) return "URGENT LOW";
  if (value < 70) return "LOW";
  if (value <= 180) return "IN RANGE";
  if (value <= 250) return "HIGH";
  return "URGENT HIGH";
}

export function getGlucoseColorClass(value: number): string {
  if (value < 55) return "text-glucose-urgent-low";
  if (value < 70) return "text-glucose-low";
  if (value <= 180) return "text-glucose-in-range";
  if (value <= 250) return "text-glucose-high";
  return "text-glucose-urgent-high";
}

export function getGlucoseBgClass(value: number): string {
  if (value < 55) return "bg-glucose-urgent-low";
  if (value < 70) return "bg-glucose-low";
  if (value <= 180) return "bg-glucose-in-range";
  if (value <= 250) return "bg-glucose-high";
  return "bg-glucose-urgent-high";
}

export function getGlucoseHex(value: number): string {
  if (value < 55) return "#ef4444";
  if (value < 70) return "#ef4444";
  if (value <= 180) return "#22c55e";
  if (value <= 250) return "#f59e0b";
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

// Generate realistic CGM data for past N hours
export function generateMockEGVs(hours: number = 24): EGVReading[] {
  const readings: EGVReading[] = [];
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const interval = 5; // minutes

  let value = 120;
  const trends = ["flat", "fortyFiveUp", "singleUp", "fortyFiveDown", "singleDown", "flat", "flat"];

  for (let t = start.getTime(); t <= now.getTime(); t += interval * 60 * 1000) {
    // Simulate realistic glucose patterns
    const hourOfDay = new Date(t).getHours();
    let drift = (Math.random() - 0.5) * 8;

    // Dawn phenomenon: rise between 4-8 AM
    if (hourOfDay >= 4 && hourOfDay <= 8) drift += 1.5;
    // Post-meal spikes around typical meal times
    if (hourOfDay >= 7 && hourOfDay <= 9) drift += 2;
    if (hourOfDay >= 12 && hourOfDay <= 14) drift += 2.5;
    if (hourOfDay >= 18 && hourOfDay <= 20) drift += 2;
    // Overnight stability
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

  // Meals
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
      // Insulin with meal
      events.push({
        timestamp: new Date(mealTime.getTime() - 5 * 60000).toISOString(),
        type: "insulin",
        value: Math.round((3 + Math.random() * 5) * 10) / 10,
      });
    }
  });

  // Exercise
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
  {
    id: "1",
    name: "Alex",
    avatar: "A",
    dob: "2012-05-15",
    relationship: "Son",
    connected: true,
  },
  {
    id: "2",
    name: "Maya",
    avatar: "M",
    dob: "2009-11-22",
    relationship: "Daughter",
    connected: true,
  },
];

// Pre-generate data per member for consistency
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

  const inRange = filtered.filter((r) => r.value >= 70 && r.value <= 180).length;
  const high = filtered.filter((r) => r.value > 180).length;
  const low = filtered.filter((r) => r.value < 70).length;
  const avg = Math.round(filtered.reduce((s, r) => s + r.value, 0) / filtered.length);

  return {
    tir: Math.round((inRange / filtered.length) * 100),
    high: Math.round((high / filtered.length) * 100),
    low: Math.round((low / filtered.length) * 100),
    avg,
    readings: filtered.length,
  };
}
