/** Simulates token streaming for portfolio demo (no API keys). */
export async function streamCannedText(
  fullText: string,
  onDelta: (chunk: string) => void,
  onDone: () => void,
  charMinMs = 8,
  charMaxMs = 22,
) {
  const rand = () => charMinMs + Math.random() * (charMaxMs - charMinMs);
  for (let i = 0; i < fullText.length; i++) {
    onDelta(fullText[i]);
    await new Promise((r) => setTimeout(r, rand()));
  }
  onDone();
}

export const DEMO_AI_INITIAL_REPLY = `Here's a quick read on the last 24 hours:

**Overall:** Time in range looks solid. There are a few post-meal bumps that line up with typical carb absorption — nothing alarming on its own.

**Patterns:** You can see gentle rises after meals and a smoother line overnight. The trend arrows suggest mostly gradual changes rather than sharp cliffs.

**Tonight:** If dinner tends to run a bit higher, a small pre-bolus tweak (with your care team's guidance) or consistent carb counting often helps. Keep an eye on any late corrections stacking.

*This is a static demo reply. Sign in to the full app for live CGM and real AI coaching.*`;

export const DEMO_AI_FOLLOWUP_PREFIX = `In the full app, I'd tailor this to your exact CGM export and events. For this demo, here's a concise take:

`;

export function demoAiReplyForUserMessage(userText: string): string {
  const t = userText.toLowerCase();
  if (t.includes("spike") || t.includes("high")) {
    return `${DEMO_AI_FOLLOWUP_PREFIX}Spikes usually trace to meals, missed pre-bolus timing, stress, or illness. Compare spike timing to carbs and insulin in your log — that pairing is the fastest way to spot a repeatable fix with your endo.`;
  }
  if (t.includes("overnight") || t.includes("night")) {
    return `${DEMO_AI_FOLLOWUP_PREFIX}Overnight control often comes down to basal tuning, late snacks, or stacking insulin. A few nights of CGM with time-stamped food and doses gives your team what they need to adjust safely.`;
  }
  if (t.includes("pattern") || t.includes("trend")) {
    return `${DEMO_AI_FOLLOWUP_PREFIX}I'm seeing meal-related variability more than random noise — that usually means predictable levers: carb counts, pre-bolus timing, and activity around meals.`;
  }
  return `${DEMO_AI_FOLLOWUP_PREFIX}Great question. In production, Sugar Sensei reads your live Dexcom stream and events to answer precisely. Try the suggested prompts on the left, or sign in for real coaching on your data.`;
}

export const DEMO_CARB_REPLY = `🍽️ **Demo meal (illustrative)**

| Food | Total Carbs | Fiber | Net Carbs |
|------|---------------|-------|-----------|
| Brown rice (~1 cup) | 45g | 2g | 43g |
| Grilled tofu | 3g | 1g | 2g |
| Veg stir-fry | 8g | 3g | 5g |

**🔢 Net carbs: ~50g (range: 45–58g)**

💡 *Rice is doing most of the work here — measuring the scoop is the biggest win for accuracy.*

⚡ **Bolus reminder: talk to your care team about pre-bolus timing before meals.**

*Demo mode: sign in for photo-based estimates from the real carb assistant.*`;
