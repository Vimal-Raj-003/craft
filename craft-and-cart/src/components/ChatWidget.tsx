"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SUPPORT_PHONE = "9943200746";
const WELCOME = "Hi 👋 Welcome to JillJill Crafts. How can I help you today?";
const STORE = "cc-chat-v1"; // current browser session only (sessionStorage); nothing is sent to or stored on the server

type Reply = { text: string; links?: { label: string; href: string }[]; chips?: string[]; feedback: boolean; escalate?: boolean };
type Msg = {
  id: number;
  role: "user" | "bot";
  text: string;
  links?: Reply["links"];
  chips?: string[];
  escalate?: boolean;
  /** "ask" = show "Was this helpful?"; "yes"/"no" = already answered */
  fb?: "ask" | "yes" | "no";
  error?: boolean;
};

const start = (): Msg[] => [{ id: 1, role: "bot", text: WELCOME, chips: ["Products", "Offers", "Shipping", "Payment", "Track my order"] }];

function load(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORE);
    if (raw) {
      const m = JSON.parse(raw) as Msg[];
      if (Array.isArray(m) && m.length) return m;
    }
  } catch {}
  return start();
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(start);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const sending = useRef(false); // blocks double sends even before React re-renders
  const nextId = useRef(100);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // restore this session's history once on the client
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMsgs(load());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-40))); } catch {}
  }, [msgs, hydrated]);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [msgs, busy, open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (pathname.startsWith("/admin")) return null; // staff screens stay uncluttered

  const push = (m: Omit<Msg, "id">) => setMsgs((x) => [...x, { ...m, id: nextId.current++ }]);

  async function send(raw: string) {
    const q = raw.trim();
    if (!q || sending.current) return;
    sending.current = true;
    setBusy(true); setText("");
    push({ role: "user", text: q });
    try {
      const r = await fetch("/api/chat", { method: "POST", body: JSON.stringify({ message: q }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error ?? "Something went wrong.");
      const reply = d as Reply;
      push({ role: "bot", text: reply.text, links: reply.links, chips: reply.chips, escalate: reply.escalate, fb: reply.feedback ? "ask" : undefined });
    } catch (e) {
      push({ role: "bot", text: `Sorry, I couldn't answer just now. ${(e as Error).message || ""} You can try again, or call our support team.`.trim(), error: true, escalate: true });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  function feedback(id: number, answer: "yes" | "no") {
    setMsgs((all) => all.map((m) => (m.id === id ? { ...m, fb: answer } : m)));
    if (answer === "yes") push({ role: "bot", text: "Glad I could help!" });
    else push({ role: "bot", text: "I'm sorry that didn't help. Would you like to speak with our support team?", escalate: true });
  }

  const lastBotAsk = [...msgs].reverse().find((m) => m.role === "bot" && m.fb === "ask")?.id;
  const callButton = (
    <a href={`tel:${SUPPORT_PHONE}`} className="btn btn-primary !min-h-11 !px-5 !py-2 text-sm">📞 Call Support</a>
  );

  return (
    <>
      <button
        ref={toggle}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        aria-controls="support-chat"
        className="fixed bottom-4 right-4 z-[55] grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_10px_30px_-8px_rgba(122,29,0,.7)] transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink sm:bottom-6 sm:right-6"
        style={{ background: "linear-gradient(135deg,#e8334f,#f5a623)", marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" /></svg>
        )}
      </button>

      {open && (
        <section
          id="support-chat"
          role="dialog"
          aria-label="Customer support chat"
          className="fixed bottom-[5.25rem] left-3 right-3 z-[55] flex max-h-[min(78vh,640px)] flex-col overflow-hidden rounded-3xl border border-[#7a1d00]/25 shadow-[0_20px_60px_-15px_rgba(122,29,0,.6)] sm:bottom-24 sm:left-auto sm:right-6 sm:w-[390px]"
          style={{ background: "rgba(255,248,230,.985)", marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <header className="flex items-center justify-between gap-3 px-4 py-3 text-[#fff4e0]" style={{ background: "linear-gradient(180deg,#a8321a,#7a1d00)" }}>
            <div>
              <p className="font-semibold leading-tight">JillJill Crafts support</p>
              <p className="text-xs opacity-80">Answers come from our real shop information</p>
            </div>
            <button type="button" onClick={() => { setOpen(false); toggle.current?.focus(); }} aria-label="Close chat" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15">✕</button>
          </header>

          <div ref={scroller} data-lenis-prevent role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-to-r from-pink to-violet text-white" : m.error ? "bg-pink/10 text-ink" : "bg-[#7a1d00]/8 text-ink"}`} style={m.role === "bot" ? { background: m.error ? undefined : "rgba(122,29,0,.07)" } : undefined}>
                  <p className="whitespace-pre-line break-words">{m.text}</p>
                  {m.links && m.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.links.map((l) =>
                        l.href.startsWith("tel:") ? (
                          <a key={l.href} href={l.href} className="rounded-full border border-[#7a1d00]/30 bg-white/70 px-3 py-1.5 text-xs font-semibold">{l.label}</a>
                        ) : (
                          <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)} className="rounded-full border border-[#7a1d00]/30 bg-white/70 px-3 py-1.5 text-xs font-semibold">{l.label}</Link>
                        ),
                      )}
                    </div>
                  )}
                  {m.chips && m.chips.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.chips.map((c) => (
                        <button key={c} type="button" disabled={busy} onClick={() => send(c)} className="rounded-full border border-pink/40 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-pink/10 disabled:opacity-50">{c}</button>
                      ))}
                    </div>
                  )}
                  {m.escalate && <div className="mt-3">{callButton}</div>}
                  {m.fb === "ask" && m.id === lastBotAsk && (
                    <div className="mt-3 border-t border-[#7a1d00]/15 pt-2">
                      <p className="text-xs font-semibold">Was this helpful?</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => feedback(m.id, "yes")} className="min-h-10 rounded-full border border-mint/50 bg-white/70 px-4 text-sm font-semibold hover:bg-mint/10">👍 Yes</button>
                        <button type="button" onClick={() => feedback(m.id, "no")} className="min-h-10 rounded-full border border-pink/50 bg-white/70 px-4 text-sm font-semibold hover:bg-pink/10">👎 No</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start" aria-label="Assistant is typing">
                <div className="flex gap-1 rounded-2xl px-4 py-3" style={{ background: "rgba(122,29,0,.07)" }}>
                  {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-[#7a1d00]/60" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(text); }}
            className="flex items-center gap-2 border-t border-[#7a1d00]/15 p-3"
          >
            <label htmlFor="chat-input" className="sr-only">Type your question</label>
            <input
              id="chat-input" ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
              placeholder="Type your question…" autoComplete="off" enterKeyHint="send"
              className="input min-w-0 flex-1 !min-h-11 !py-2 text-[16px]"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send message" className="btn btn-primary !min-h-11 !px-4 !py-2 text-sm">{busy ? "…" : "Send"}</button>
          </form>
        </section>
      )}
    </>
  );
}
