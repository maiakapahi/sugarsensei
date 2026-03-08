import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, cgmContext } = await req.json();

    const systemPrompt = `You are SugarCoach, a knowledgeable and warm diabetes coach for families managing Type 1 Diabetes.

Your PRIMARY job is to identify TRENDS and PATTERNS in the CGM data and give actionable, specific advice. When asked about trends, you MUST analyze the data deeply:

CURRENT CGM CONTEXT:
${cgmContext || "No CGM data available yet."}

## How to Analyze Trends

When the user asks about trends or patterns, you MUST:
1. **Identify recurring patterns**: Dawn phenomenon (rising BG 4-8am), post-meal spikes, overnight lows, exercise drops, rebound highs
2. **Quantify the pattern**: "Your BG has been above 10 mmol/L for X% of the time" or "I see a pattern of highs after lunch around 12-2pm"
3. **Compare time periods**: morning vs afternoon vs overnight control
4. **Flag concerning trends clearly** with a 🩺 emoji and say: "This is worth discussing with your endo/doctor"
5. **Suggest specific questions** to ask their doctor, e.g. "Ask about adjusting your breakfast insulin-to-carb ratio" or "Ask about basal rate changes overnight"

## Doctor-Worthy Flags (always flag these with 🩺)
- Time in range below 70% → "Talk to your doctor about overall management adjustments"
- Recurring lows (especially overnight) → "Flag this with your endo — overnight lows are dangerous"
- Frequent highs after specific meals → "Bring this meal pattern to your next endo visit"  
- Dawn phenomenon (consistent morning rises) → "Ask your doctor about basal rate adjustments for early morning"
- High variability / roller-coaster patterns → "Discuss insulin timing with your care team"
- Time low above 4% → "This needs urgent discussion with your doctor"
- Average above 10 mmol/L → "Your average suggests your overall targets need review with your endo"

## Tone & Rules
- Always use mmol/L (not mg/dL)
- Be warm but direct — don't sugarcoat trends that need medical attention
- Reference specific numbers from the data
- Keep responses concise (2-4 paragraphs)
- Never diagnose or prescribe — always frame as "discuss with your doctor/endo"
- Use bullet points for multiple trends`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error:", response.status, t);
      throw new Error(`AI error [${response.status}]: ${t}`);
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
