"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Disclosure } from "./disclosure";
import type { Faq, HelpAnswer } from "@/lib/help";
type Entry = { question: string; reply: HelpAnswer };
export function HelpWidget() {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null),
    launcher = useRef<HTMLButtonElement>(null),
    bottom = useRef<HTMLDivElement>(null),
    controller = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false),
    [faqs, setFaqs] = useState<Faq[]>([]),
    [ai, setAi] = useState(false),
    [consent, setConsent] = useState(false),
    [question, setQuestion] = useState(""),
    [entries, setEntries] = useState<Entry[]>([]),
    [loading, setLoading] = useState(false),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/help", {
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Help could not load.");
      setFaqs(data.faqs);
      setAi(data.ai);
    } catch {
      setError("Help couldn’t load. Try again or contact the team.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      void load();
    } else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    setOpen(false);
    controller.current?.abort();
    controller.current = null;
    setSending(false);
  }, [path]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [entries, sending]);
  useEffect(() => () => controller.current?.abort(), []);
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending || question.trim().length < 3) return;
    setSending(true);
    setError("");
    const current = question.trim();
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 40000);
    try {
      const r = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: current, aiConsent: ai && consent }),
        signal: abort.signal,
      });
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.error || "Your question could not be answered.");
      setEntries((old) => [
        ...old.slice(-9),
        { question: current, reply: data },
      ]);
      setQuestion("");
    } catch {
      if (controller.current === abort)
        setError(
          "Your question couldn’t be answered. Try again or contact the team.",
        );
    } finally {
      clearTimeout(timeout);
      if (controller.current === abort) setSending(false);
    }
  }
  if (path.startsWith("/admin")) return null;
  return (
    <>
      <button
        className="app-help-launcher"
        ref={launcher}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-help-dialog"
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
        </svg>
        <span>Help</span>
      </button>
      <dialog
        id="site-help-dialog"
        className="app-help-dialog"
        ref={dialog}
        aria-labelledby="site-help-title"
        onCancel={close}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) {
            const rect = dialog.current.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              close();
          }
        }}
      >
        <header className="app-help-header">
          <div>
            <h2 id="site-help-title">
              {ai ? "REMOTE HUSTLE AI helper" : "How can we help?"}
            </h2>
            <p>
              {ai
                ? "Website guidance, backed by published answers."
                : "Answers and useful links."}
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close help">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="app-help-body">
          <nav className="app-help-links" aria-label="Help shortcuts">
            <Link href="/faq" onClick={close}>
              All FAQs
            </Link>
            <Link href="/search" onClick={close}>
              Search the site
            </Link>
            <Link href="/about#contact" onClick={close}>
              Contact the team
            </Link>
          </nav>
          {loading ? (
            <p role="status">Loading answers…</p>
          ) : (
            <div className="app-help-faqs">
              {faqs.slice(0, 6).map((f) => (
                <Disclosure key={f.id} label={f.question}>
                  <p className="app-preline">{f.answer}</p>
                </Disclosure>
              ))}
            </div>
          )}
          <div
            className="app-help-conversation"
            role="log"
            aria-label="Help conversation"
            aria-live="polite"
            aria-relevant="additions"
          >
            {entries.map((entry, i) => (
              <div className="app-help-entry" key={i}>
                <p className="app-help-question">{entry.question}</p>
                <div className="app-help-answer">
                  <span className="rm-eyebrow">
                    {entry.reply.mode === "ai"
                      ? "AI answer · check the sources"
                      : "From the FAQs"}
                  </span>
                  {entry.reply.notice && (
                    <p className="rm-note">{entry.reply.notice}</p>
                  )}
                  <p className="app-preline">{entry.reply.answer}</p>
                  <ul>
                    {entry.reply.sources.map((s) => (
                      <li key={s.href}>
                        <Link href={s.href} onClick={close}>
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          {sending && <p role="status">Finding an answer…</p>}
          {error && (
            <div role="alert">
              <p>{error}</p>
              {!faqs.length && (
                <button
                  type="button"
                  className="rm-text-link"
                  onClick={() => void load()}
                >
                  Try loading help again
                </button>
              )}
            </div>
          )}
          <div ref={bottom} />
        </div>
        <form className="app-help-form" onSubmit={submit}>
          {ai && (
            <label className="app-help-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Use AI: send my question to OpenAI to answer it.{" "}
                <Link href="/privacy#ai-helper" onClick={close}>
                  Privacy details
                </Link>
              </span>
            </label>
          )}
          <label htmlFor="help-question">
            {ai && consent ? "Ask about the website" : "Search the FAQs"}
          </label>
          <div className="app-help-compose">
            <input
              id="help-question"
              name="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              minLength={3}
              maxLength={600}
              placeholder="How do I download my purchase?"
              required
              disabled={sending}
              autoComplete="off"
            />
            <button
              className="rm-btn"
              type="submit"
              disabled={sending || loading || question.trim().length < 3}
            >
              Ask
            </button>
          </div>
          <p className="rm-note">
            Don’t share passwords, payment details or private documents.{" "}
            {ai
              ? "AI can make mistakes. It cannot view your account or make changes."
              : "For personal account issues, contact the team."}
          </p>
        </form>
      </dialog>
    </>
  );
}
