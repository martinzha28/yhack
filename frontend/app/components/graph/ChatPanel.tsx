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

export default function ChatPanel({
  onHighlight,
  onSelectNode,
}: ChatPanelProps) {
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
    <div className="h-full w-80 bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-800 tracking-tight">
            Org Agent
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
      >
        {messages.length === 0 && !loading && (
          <div className="text-center py-8 space-y-3">
            <p className="text-slate-700 text-sm font-medium">
              Ask about the org
            </p>
            <div className="space-y-1.5 text-xs text-slate-400">
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
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-sm"
              } ${
                msg.role === "assistant" && msg.highlightNodeIds?.length
                  ? "cursor-pointer hover:border-blue-300 transition-colors"
                  : ""
              }`}
              onClick={() => {
                if (msg.role === "assistant" && msg.highlightNodeIds?.length) {
                  onHighlight(new Set(msg.highlightNodeIds));
                }
              }}
            >
              {msg.content}
              {msg.highlightNodeIds && msg.highlightNodeIds.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                  {msg.highlightNodeIds.map((id) => (
                    <button
                      key={id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode?.(id);
                      }}
                      className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer font-medium"
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
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-slate-400">
              <span className="inline-flex gap-1">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0ms" }}
                >
                  •
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "150ms" }}
                >
                  •
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "300ms" }}
                >
                  •
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 bg-slate-50 text-slate-800 text-sm rounded-xl px-3 py-2 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl px-3 py-2 transition-colors cursor-pointer shadow-sm"
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
