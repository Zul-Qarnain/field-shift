"use client";

import { useContext, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { LangContext } from "@/lib/lang";

type Msg = { role: "user" | "assistant"; content: string };

function renderMessageContent(content: string) {
  // Normalize markdown and multiline bold markers
  const normalized = content
    .replace(/\*\*\s*\n\s*\*\*/g, "\n")
    .replace(/\*\*\*+/g, "**");

  const lines = normalized.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed text-ink-hi">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Clean out orphaned ** at beginning or end of line if unbalanced
        const starCount = (trimmed.match(/\*\*/g) || []).length;
        if (starCount % 2 !== 0) {
          trimmed = trimmed.replace(/\*\*$/, "").replace(/^\*\*/, "");
        }

        const isNumList = /^\d+\.\s+/.test(trimmed);
        const isBullet = /^[-*•]\s+/.test(trimmed);

        const parts = trimmed.split(/(\*\*.*?\*\*)/g);

        return (
          <div key={idx} className={`${isNumList || isBullet ? "pl-2 font-normal" : ""}`}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
                return (
                  <strong key={pIdx} className="font-semibold text-ink-hi">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              // Strip any stray raw asterisks so they never leak into the chat
              return <span key={pIdx}>{part.replace(/\*/g, "")}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export function ChatWidget() {
  const { lang } = useContext(LangContext);
  const bn = lang === "bn";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    // shortcut: sends only the last 19 turns so the server's 20-turn cap never rejects a long chat
    const next = [...msgs, { role: "user" as const, content }].slice(-19);
    while (next[0]?.role !== "user") next.shift();
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error();
      setMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: bn ? "দুঃখিত, এখন উত্তর দেওয়া যাচ্ছে না।" : "Sorry, I can't answer right now." }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={bn ? "সহকারীকে জিজ্ঞাসা করুন" : "Ask the assistant"}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-action text-white shadow-drawer"
      >
        <MessageCircle size={20} />
      </button>
    );

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 flex max-h-[70vh] flex-col rounded-xl border border-line bg-surface shadow-drawer sm:left-auto sm:w-96">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-display text-sm font-bold text-ink-hi">{bn ? "ফিল্ড শিফট সহকারী" : "Field Shift assistant"}</span>
        <button onClick={() => setOpen(false)} aria-label={bn ? "বন্ধ করুন" : "Close"} className="text-ink-low hover:text-ink-hi">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
        {msgs.length === 0 && (
          <p className="text-ink-low">{bn ? "ফসল চক্র নিয়ে প্রশ্ন করুন।" : "Ask about crop rotation."}</p>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl px-3.5 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-8 bg-action text-white font-medium"
                : "mr-6 border border-line bg-elevated text-ink-mid shadow-sm"
            }`}
          >
            {renderMessageContent(m.content)}
          </div>
        ))}
        {busy && <p className="text-ink-low">…</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          aria-label={bn ? "বার্তা" : "Message"}
          placeholder={bn ? "আপনার প্রশ্ন লিখুন…" : "Type your question…"}
          className="h-10 w-full rounded-lg border border-line bg-inset px-3 text-sm text-ink-hi placeholder:text-ink-low focus:border-action focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label={bn ? "পাঠান" : "Send"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-action text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
