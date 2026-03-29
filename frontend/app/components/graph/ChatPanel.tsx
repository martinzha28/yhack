"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  highlightNodeIds?: string[];
}

interface ChatPanelProps {
  onHighlight: (ids: Set<string> | null) => void;
  onSelectNode?: (id: string) => void;
}

export default function ChatPanel({ onHighlight, onSelectNode }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer,
        highlightNodeIds: data.highlightNodeIds,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.highlightNodeIds?.length > 0) {
        onHighlight(new Set(data.highlightNodeIds));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
    onHighlight(null);
  }

  return (
    <div className="h-full w-80 bg-zinc-850 border-r border-zinc-700/60 flex flex-col flex-shrink-0"
      style={{ backgroundColor: "#1a1a1f" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-sm font-medium text-zinc-200">
            Org Agent
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-zinc-500 hover:text-zinc-300 text-xs px-2 py-1 rounded transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="text-zinc-500 text-xs text-center py-8 space-y-2">
            <p className="text-zinc-400 text-sm font-medium">Ask about the org</p>
            <div className="space-y-1">
              <p>&ldquo;Who&rsquo;s working on billing-v2?&rdquo;</p>
              <p>&ldquo;Who is an expert in Kubernetes?&rdquo;</p>
              <p>&ldquo;What is the auth-refactor about?&rdquo;</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-700/70 text-zinc-200 hover:bg-zinc-600/70 transition-colors"
              } ${msg.role === "assistant" && msg.highlightNodeIds?.length ? "cursor-pointer" : ""}`}
              onClick={() => {
                if (msg.role === "assistant" && msg.highlightNodeIds?.length) {
                  onHighlight(new Set(msg.highlightNodeIds));
                }
              }}
            >
              {msg.content}
              {msg.highlightNodeIds && msg.highlightNodeIds.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-600/50 flex flex-wrap gap-1">
                  {msg.highlightNodeIds.map((id) => (
                    <button
                      key={id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode?.(id);
                      }}
                      className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-500/50 transition-colors cursor-pointer"
                    >
                      {id.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-700/70 rounded-lg px-3 py-2 text-sm text-zinc-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-1 border-t border-zinc-700/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 bg-zinc-700/60 text-zinc-200 text-sm rounded-lg px-3 py-2 placeholder:text-zinc-500 border border-zinc-600/50 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg px-3 py-2 transition-colors cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
