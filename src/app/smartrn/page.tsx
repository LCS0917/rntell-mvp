"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { Send, ChevronDown, ChevronUp, Bot, Sparkles } from "lucide-react";

interface Source {
  question: string;
  answer_snippet: string;
  confidence: number;
}

interface Message {
  role: "user" | "model";
  content: string;
  sources?: Source[];
}

const STARTER_QUESTIONS = [
  "What are typical pay rates for travel nurses in California?",
  "How do housing stipends work for travel nursing?",
  "What should I look for when reading a travel nurse contract?",
  "How can I negotiate a better pay package directly with a facility?",
  "What are GSA rates and why do they matter for stipends?",
];

export default function SmartRNPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(
    new Set()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  async function sendMessage(text: string) {
    const query = text.trim();
    if (!query || loading) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Build history (excluding the current message)
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/smartrn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }

      const data = await res.json();
      const assistantMsg: Message = {
        role: "model",
        content: data.answer,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      const errorMsg: Message = {
        role: "model",
        content: `Sorry, something went wrong: ${e instanceof Error ? e.message : "Unknown error"}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function toggleSources(index: number) {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-warm">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-brand-gray-200 bg-white px-6">
        <Link href="/" className="text-xl font-bold text-brand-orange">
          RNTell
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/jobs"
            className="text-sm font-medium text-brand-charcoal hover:text-brand-orange"
          >
            Find Jobs
          </Link>
          <Link
            href="/analyze"
            className="text-sm font-medium text-brand-gray-500 hover:text-brand-charcoal"
          >
            Analyze an Offer
          </Link>
          <Link
            href="/smartrn"
            className="text-sm font-medium text-brand-orange"
          >
            SmartRN
          </Link>
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-brand-charcoal transition-colors hover:bg-brand-gray-100"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Chat area */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        {/* Header — always visible when no messages */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center gap-2 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange/10">
                <Sparkles size={24} className="text-brand-orange" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-brand-charcoal">
                  SmartRN
                </h1>
                <p className="text-sm text-brand-gray-500">
                  Powered by real nurse community data
                </p>
              </div>
            </div>
            <p className="max-w-md text-center text-brand-gray-500">
              Ask me anything about travel nursing — pay rates, stipends,
              contracts, negotiation, housing, and more.
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-br-md bg-brand-orange px-4 py-3 text-white"
                      : "space-y-2"
                  }`}
                >
                  {msg.role === "model" && (
                    <div className="flex items-start gap-2">
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange/10">
                        <Bot size={14} className="text-brand-orange" />
                      </div>
                      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                        <div className="prose prose-sm max-w-none text-brand-charcoal whitespace-pre-wrap">
                          {msg.content}
                        </div>
                        {/* Source pills */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 border-t border-brand-gray-100 pt-2">
                            <button
                              onClick={() => toggleSources(i)}
                              className="flex items-center gap-1 text-xs text-brand-gray-400 hover:text-brand-gray-600"
                            >
                              {expandedSources.has(i) ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                              {msg.sources.length} source
                              {msg.sources.length !== 1 ? "s" : ""}
                            </button>
                            {expandedSources.has(i) && (
                              <div className="mt-2 space-y-2">
                                {msg.sources.map((src, si) => (
                                  <div
                                    key={si}
                                    className="rounded-lg bg-brand-gray-50 p-2 text-xs"
                                  >
                                    <p className="font-medium text-brand-charcoal">
                                      {src.question}
                                    </p>
                                    <p className="mt-1 text-brand-gray-500">
                                      {src.answer_snippet}
                                    </p>
                                    <span className="mt-1 inline-block rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-medium text-brand-orange">
                                      {Math.round(src.confidence * 100)}%
                                      confidence
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {msg.role === "user" && (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange/10">
                    <Bot size={14} className="text-brand-orange" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-gray-300 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-gray-300 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-brand-gray-300 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="sticky bottom-0 border-t border-brand-gray-200 bg-brand-warm pt-4 pb-4">
          <div className="flex items-end gap-2 rounded-xl border border-brand-gray-200 bg-white px-3 py-2 shadow-sm focus-within:border-brand-orange">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SmartRN anything about travel nursing..."
              disabled={loading}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-brand-charcoal outline-none placeholder:text-brand-gray-400 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-brand-gray-400">
            SmartRN answers are based on community data and may not be fully
            accurate. Always verify with the facility.
          </p>
          {/* Starter questions below input */}
          {messages.length === 0 && !loading && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-full border border-brand-gray-200 bg-white px-3 py-1.5 text-xs text-brand-charcoal transition-colors hover:border-brand-orange hover:bg-brand-orange/5"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
