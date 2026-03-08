import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use sandbox for development
const DEXCOM_BASE = "https://sandbox-api.dexcom.com";
const DEXCOM_AUTH_URL = `${DEXCOM_BASE}/v2/oauth2/login`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEXCOM_CLIENT_ID = Deno.env.get("DEXCOM_CLIENT_ID");
    if (!DEXCOM_CLIENT_ID) throw new Error("DEXCOM_CLIENT_ID not configured");

    const { memberId, redirectUri } = await req.json();
    if (!memberId) throw new Error("memberId is required");
    if (!redirectUri) throw new Error("redirectUri is required");

    // Build Dexcom OAuth URL with member ID in state
    const params = new URLSearchParams({
      client_id: DEXCOM_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "offline_access",
      state: memberId,
    });

    const authUrl = `${DEXCOM_AUTH_URL}?${params.toString()}`;

    return new Response(JSON.stringify({ authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dexcom-auth error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
