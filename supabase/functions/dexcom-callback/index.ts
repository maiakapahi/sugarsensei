import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEXCOM_BASE = "https://sandbox-api.dexcom.com";
const DEXCOM_TOKEN_URL = `${DEXCOM_BASE}/v3/oauth2/token`;

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

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { code, memberId, redirectUri } = await req.json();
    if (!code) throw new Error("Authorization code is required");
    if (!memberId) throw new Error("memberId is required");
    if (!redirectUri) throw new Error("redirectUri is required");

    // Exchange code for tokens
    const tokenRes = await fetch(DEXCOM_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DEXCOM_CLIENT_ID,
        client_secret: DEXCOM_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Dexcom token exchange failed:", tokenData);
      throw new Error(`Dexcom token exchange failed: ${JSON.stringify(tokenData)}`);
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { data: member, error: memberLookupError } = await supabase
      .from("members")
      .select("id")
      .eq("id", memberId)
      .eq("parent_user_id", user.id)
      .maybeSingle();

    if (memberLookupError) throw new Error(memberLookupError.message);
    if (!member) throw new Error("Member not found or not authorized");

    const { data: updatedMember, error: updateError } = await supabase
      .from("members")
      .update({
        dexcom_access_token: access_token,
        dexcom_refresh_token: refresh_token,
        dexcom_token_expiry: expiresAt,
      })
      .eq("id", memberId)
      .eq("parent_user_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("Failed to store tokens:", updateError);
      throw new Error(`Failed to store Dexcom tokens: ${updateError.message}`);
    }

    if (!updatedMember) {
      throw new Error(`Failed to store Dexcom tokens: member ${memberId} was not found`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dexcom-callback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
