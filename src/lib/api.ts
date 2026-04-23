import { supabase } from "@/integrations/supabase/client";

const DEXCOM_REDIRECT_URI = `${window.location.origin}/dexcom-callback`;

async function invokeSupabaseFunction(functionName: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `Function ${functionName} failed with status ${resp.status}`);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}

export async function startDexcomOAuth(memberId: string) {
  const data = await invokeSupabaseFunction("dexcom-auth", {
    memberId,
    redirectUri: DEXCOM_REDIRECT_URI,
  });

  // Redirect to Dexcom login
  window.location.href = data.authUrl;
}

export async function completeDexcomOAuth(code: string, memberId: string) {
  return invokeSupabaseFunction("dexcom-callback", {
    code,
    memberId,
    redirectUri: DEXCOM_REDIRECT_URI,
  });
}

export async function fetchDexcomData(memberId: string, hours: number = 24) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  return invokeSupabaseFunction("dexcom-data", { memberId, hours });
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function streamAICoach({
  messages,
  cgmContext,
  onDelta,
  onDone,
}: {
  messages: ChatMessage[];
  cgmContext: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, cgmContext }),
  });

  if (!resp.ok || !resp.body) {
    if (resp.status === 429) throw new Error("Rate limited — try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted.");
    throw new Error("Failed to connect to AI coach");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { done: readerDone, value } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  onDone();
}
