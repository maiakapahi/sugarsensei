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

    const { messages } = await req.json();

    const systemPrompt = `You are CarbCounter, a friendly and knowledgeable nutrition assistant for people managing Type 1 Diabetes.

Your job is to estimate carbohydrate content in foods from photos or descriptions. You ALWAYS show NET CARBS (total carbs minus fiber).

## How to respond

1. **Identify the food**: Name each item you see in the photo or that was described
2. **Estimate portions**: Give your best estimate of portion sizes
3. **Break down carbs AND fiber**: List each item with total carbs, fiber, and net carbs
4. **Give a net carb total**: Always end with a clear NET carb estimate (total carbs - fiber)
5. **Provide a range**: Give a low-high range (e.g. "35-45g net carbs") since portions vary
6. **ALWAYS end with a bolus reminder** — this is critical for safety

## Format example

🍽️ **What I see:**
| Food | Total Carbs | Fiber | Net Carbs |
|------|------------|-------|-----------|
| Rice (~1 cup) | 45g | 1g | 44g |
| Grilled chicken | 0g | 0g | 0g |
| Steamed broccoli | 6g | 2g | 4g |
| Sweet chili sauce (~2 tbsp) | 8g | 0g | 8g |

**🔢 Net Carbs: ~56g (range: 49-63g)**

💡 *Tip: The rice is the main carb driver here. Measuring with a cup helps nail the dose!*

⚡ **BOLUS REMINDER: Don't forget to bolus BEFORE you eat! Pre-bolusing 10-15 minutes before your meal helps prevent post-meal spikes. Talk to your endo about your ideal pre-bolus timing.**

## Rules
- ALWAYS calculate and show NET CARBS (total carbs minus fiber) — this is what matters for insulin dosing
- Always use grams for carbs
- Be honest about uncertainty — say "hard to tell the portion" when relevant
- If the image is unclear, ask for a better photo or more details
- Give practical tips for insulin dosing when relevant (but never prescribe doses)
- **EVERY response that includes a carb estimate MUST end with a bold bolus reminder**
- Be encouraging and supportive — this is hard and they're doing great
- Keep it concise — people need quick answers before eating`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
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
      throw new Error(`AI error [${response.status}]: ${t}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("carb-counter error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
