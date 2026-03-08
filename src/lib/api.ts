import { supabase } from "@/integrations/supabase/client";

const DEXCOM_REDIRECT_URI = `${window.location.origin}/dexcom-callback`;

export async function startDexcomOAuth(memberId: string) {
  const { data, error } = await supabase.functions.invoke("dexcom-auth", {
    body: { memberId, redirectUri: DEXCOM_REDIRECT_URI },
  });

  if (error) throw new Error(error.message || "Failed to start Dexcom auth");
  if (data?.error) throw new Error(data.error);

  // Redirect to Dexcom login
  window.location.href = data.authUrl;
}

export async function completeDexcomOAuth(code: string, memberId: string) {
  const { data, error } = await supabase.functions.invoke("dexcom-callback", {
    body: { code, memberId, redirectUri: DEXCOM_REDIRECT_URI },
  });

  if (error) throw new Error(error.message || "Failed to complete Dexcom auth");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchDexcomData(memberId: string, hours: number = 24) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("dexcom-data", {
    body: { memberId, hours },
  });

  if (error) throw new Error(error.message || "Failed to fetch Dexcom data");
  if (data?.error) throw new Error(data.error);
  return data;
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
