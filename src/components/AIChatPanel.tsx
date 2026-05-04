import { useState, useRef, useEffect } from "react";
import { streamAICoach, ChatMessage } from "@/lib/api";
import { usePortfolioDemo } from "@/context/PortfolioDemoContext";
import { streamCannedText, DEMO_AI_INITIAL_REPLY, demoAiReplyForUserMessage } from "@/lib/demo-stream";
import { Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SUGGESTED_CHIPS = [
  "What patterns do you see?",
  "Why might there have been a spike?",
  "What should we watch for tonight?",
  "How was overnight control?",
  "Any concerning trends?",
];

interface AIChatPanelProps {
  cgmContext: string;
  initialInsight?: string;
}

export function AIChatPanel({ cgmContext, initialInsight }: AIChatPanelProps) {
  const portfolioDemo = usePortfolioDemo();
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialInsight ? [{ role: "assistant", content: initialInsight }] : []
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoInsightLoaded, setAutoInsightLoaded] = useState(!!initialInsight);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-generate insight on mount if no initial insight
  useEffect(() => {
    if (!autoInsightLoaded && cgmContext) {
      setAutoInsightLoaded(true);
      generateInsight();
    }
  }, [cgmContext]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function generateInsight() {
    setIsStreaming(true);
    let content = "";
    const updateAssistant = (chunk: string) => {
      content += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
        }
        return [...prev, { role: "assistant", content }];
      });
    };
    try {
      if (portfolioDemo) {
        await streamCannedText(DEMO_AI_INITIAL_REPLY, updateAssistant, () => setIsStreaming(false), 4, 12);
        return;
      }
      await streamAICoach({
        messages: [{
          role: "user",
          content: "Analyze the past 24 hours of glucose data. Give me a brief summary of how things are looking, call out any notable patterns, and mention anything worth watching next.",
        }],
        cgmContext,
        onDelta: updateAssistant,
        onDone: () => setIsStreaming(false),
      });
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
      setIsStreaming(false);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    let content = "";
    const updateAssistant = (chunk: string) => {
      content += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
        }
        return [...prev, { role: "assistant", content }];
      });
    };

    try {
      if (portfolioDemo) {
        const reply = demoAiReplyForUserMessage(userMsg.content);
        await streamCannedText(reply, updateAssistant, () => setIsStreaming(false), 4, 12);
        return;
      }
      await streamAICoach({
        messages: [...messages, userMsg],
        cgmContext,
        onDelta: updateAssistant,
        onDone: () => setIsStreaming(false),
      });
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2 text-foreground"
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {isStreaming && messages.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-surface-2 rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
              Analyzing glucose data...
            </div>
          </div>
        )}
      </div>

      {/* Suggested chips */}
      {messages.length <= 1 && !isStreaming && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => sendMessage(chip)}
              className="text-xs bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 pb-16 sm:pb-3 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about glucose patterns..."
            disabled={isStreaming}
            className="flex-1 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="bg-primary text-primary-foreground p-2 rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
