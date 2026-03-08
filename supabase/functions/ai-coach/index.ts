import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { messages, cgmContext } = await req.json();

    const systemPrompt = `You are SugarCoach, a knowledgeable and warm diabetes coach for families managing Type 1 Diabetes. You provide practical, actionable advice based on CGM data.

Your tone: warm, knowledgeable, practical — like a trusted diabetes educator. Never alarming or clinical. Use simple language a parent or teen would understand.

IMPORTANT: Always use mmol/L units (not mg/dL). The data provided is already in mmol/L.

CURRENT CGM CONTEXT:
${cgmContext || "No CGM data available yet."}

Guidelines:
- Reference specific numbers and trends from the data
- Suggest actionable next steps
- Explain the "why" behind patterns
- Be encouraging about good control
- Flag concerning patterns gently with practical suggestions
- Never diagnose or replace medical advice — always recommend consulting their endo for medication changes
- Keep responses concise (2-4 paragraphs max)`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenAI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Invalid OpenAI API key." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI error [${response.status}]: ${t}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
