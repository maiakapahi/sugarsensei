import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEXCOM_BASE = "https://sandbox-api.dexcom.com";
const DEXCOM_TOKEN_URL = `${DEXCOM_BASE}/v3/oauth2/token`;

async function refreshAccessToken(
  supabase: any,
  memberId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch(DEXCOM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase.from("members").update({
    dexcom_access_token: data.access_token,
    dexcom_refresh_token: data.refresh_token,
    dexcom_token_expiry: expiresAt,
  }).eq("id", memberId);

  return data.access_token;
}

async function fetchDexcomApi(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(`${DEXCOM_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401) return { _unauthorized: true };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dexcom API error [${res.status}]: ${text}`);
  }

  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEXCOM_CLIENT_ID = Deno.env.get("DEXCOM_CLIENT_ID");
    const DEXCOM_CLIENT_SECRET = Deno.env.get("DEXCOM_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!DEXCOM_CLIENT_ID) throw new Error("DEXCOM_CLIENT_ID not configured");
    if (!DEXCOM_CLIENT_SECRET) throw new Error("DEXCOM_CLIENT_SECRET not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Validate auth using service role client
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { memberId, hours = 24 } = await req.json();
    if (!memberId) throw new Error("memberId is required");

    // Get member and verify ownership
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("id", memberId)
      .eq("parent_user_id", user.id)
      .single();

    if (memberError || !member) throw new Error("Member not found or not authorized");
    if (!member.dexcom_access_token) {
      return new Response(JSON.stringify({ error: "Dexcom not connected", needsAuth: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = member.dexcom_access_token;

    // Check if token is expired
    if (member.dexcom_token_expiry && new Date(member.dexcom_token_expiry) <= new Date()) {
      try {
        accessToken = await refreshAccessToken(
          supabase, memberId, member.dexcom_refresh_token!,
          DEXCOM_CLIENT_ID, DEXCOM_CLIENT_SECRET
        );
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return new Response(JSON.stringify({ error: "Dexcom re-authorization needed", needsAuth: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Calculate time range — Dexcom requires YYYY-MM-DDThh:mm:ss (no Z)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "");
    const timeParams = {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
    };

    // Fetch EGVs and events in parallel
    let [egvResult, eventsResult] = await Promise.all([
      fetchDexcomApi("/v3/users/self/egvs", accessToken, timeParams),
      fetchDexcomApi("/v3/users/self/events", accessToken, timeParams),
    ]);

    // Handle 401 - try refresh once
    if (egvResult?._unauthorized || eventsResult?._unauthorized) {
      try {
        accessToken = await refreshAccessToken(
          supabase, memberId, member.dexcom_refresh_token!,
          DEXCOM_CLIENT_ID, DEXCOM_CLIENT_SECRET
        );
        [egvResult, eventsResult] = await Promise.all([
          fetchDexcomApi("/v3/users/self/egvs", accessToken, timeParams),
          fetchDexcomApi("/v3/users/self/events", accessToken, timeParams),
        ]);
      } catch {
        return new Response(JSON.stringify({ error: "Dexcom re-authorization needed", needsAuth: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse EGV records
    const egvs = (egvResult?.records || []).map((r: any) => ({
      timestamp: r.displayTime || r.systemTime,
      value: r.value,
      trend: r.trend,
      trendRate: r.trendRate,
    }));

    // Parse events
    const events = (eventsResult?.records || []).map((r: any) => ({
      timestamp: r.displayTime || r.systemTime,
      type: r.eventType?.toLowerCase() === "carbs" ? "carbs" :
            r.eventType?.toLowerCase() === "insulin" ? "insulin" :
            r.eventType?.toLowerCase() === "exercise" ? "exercise" : r.eventType,
      value: r.value,
      duration: r.duration,
    }));

    return new Response(JSON.stringify({ egvs, events, memberName: member.name }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dexcom-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
