import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use sandbox for development
const DEXCOM_BASE = "https://api.dexcom.eu";
const DEXCOM_AUTH_URL = `${DEXCOM_BASE}/v3/oauth2/login`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEXCOM_CLIENT_ID = Deno.env.get("DEXCOM_CLIENT_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!DEXCOM_CLIENT_ID) throw new Error("DEXCOM_CLIENT_ID not configured");
    if (!SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { memberId, redirectUri } = await req.json();
    if (!memberId) throw new Error("memberId is required");
    if (!redirectUri) throw new Error("redirectUri is required");

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("id", memberId)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (memberError) throw new Error(memberError.message);
    if (!member) throw new Error("Member not found or not authorized");

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
