import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fastReply } from "@/lib/assistant-fast";
import { Bot, Copy, Loader2, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
  /** Milliseconds the request took, shown for server answers. */
  elapsedMs?: number;
}

/** Suggested questions, split between station operations and general knowledge. */
const SUGGESTIONS = [
  "Guide me through the console from the start.",
  "What should I do next on station, and why?",
  "Summarise the current continuity risk and what I should do before the drop.",
  "Which incidents are critical right now and what is the triage order?",
  "How much generation headroom does the microgrid have?",
  "What happens to the station if the generator hall fails completely?",
];

const GENERAL_SUGGESTIONS = [
  "Explain the katabatic winds that drive Antarctic station weather.",
  "What makes a polar station water system freeze, and how is that prevented?",
  "How does triple modular redundancy work in a radiation environment?",
];

/** Stage text shown while a server answer is in flight. */
const STAGES = [
  "Reading live station context",
  "Checking incidents and continuity",
  "Composing the answer",
];

/**
 * Types out an answer as it arrives.
 *
 * Streaming from the model is not available through the action, so the answer
 * is revealed at reading speed instead: the operator starts reading instantly
 * rather than waiting for a full paragraph to paint. A reduced-motion user gets
 * the full answer immediately.
 */
function TypedBubble({ content, className }: { content: string; className?: string }) {
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [shown, setShown] = useState(reduced ? content.length : 0);

  useEffect(() => {
    if (reduced) {
      setShown(content.length);
      return;
    }
    const started = performance.now();
    const duration = Math.min(1100, 200 + content.length * 2.2);
    let frame = 0;
    const step = () => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      setShown(Math.round(progress * content.length));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [content, reduced]);

  return (
    <div className="whitespace-pre-wrap">
      {reduced ? content : content.slice(0, shown)}
      {!reduced && shown < content.length && <span className="ml-0.5 animate-pulse">|</span>}
    </div>
  );
}

/**
 * Station assistant dock.
 *
 * Fast questions - greetings, identity, how-to - are answered locally in the
 * same tick, so the dock never feels like it is thinking about "hello".
 * Everything else goes to the assistant action, which injects live station
 * context and answers both operational and general questions.
 */
export function AssistantDock({
  slug,
  stationLabel,
}: {
  slug: string;
  stationLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const ask = useAction(api.assistant.ask);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastQuestion, setLastQuestion] = useState("");

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Ctrl/Cmd + K opens the assistant, Escape closes it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Staged status text keeps the wait legible instead of a bare spinner.
  useEffect(() => {
    if (!busy) {
      setStage(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 900);
    return () => window.clearInterval(timer);
  }, [busy]);

  const submit = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;
      setInput("");
      setLastQuestion(trimmed);

      // Instant answers never touch the network.
      const quick = fastReply(trimmed);
      if (quick) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: quick.answer, model: quick.model, elapsedMs: 0 },
        ]);
        return;
      }

      setBusy(true);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      const started = performance.now();
      try {
        const history = messages
          .slice(-6)
          .map((message) => ({ role: message.role, content: message.content }));
        const result = await ask({ slug, question: trimmed, history });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.answer,
            model: result.model,
            elapsedMs: Math.round(performance.now() - started),
          },
        ]);
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Assistant unavailable: ${String(error).slice(0, 180)}`,
            model: "error",
            elapsedMs: Math.round(performance.now() - started),
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [ask, busy, messages, slug],
  );

  const copyLast = useCallback(() => {
    const last = [...messages].reverse().find((message) => message.role === "assistant");
    if (last && typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(last.content);
    }
  }, [messages]);

  return (
    <>
      <Button
        variant={open ? "secondary" : "default"}
        size="sm"
        className="fixed bottom-5 right-5 z-40 shadow-lg"
        onClick={() => setOpen((value) => !value)}
      >
        <Bot className="mr-2 size-4" />
        Station assistant
        <span className="cc-mono ml-2 hidden text-[9px] opacity-70 sm:inline">Ctrl K</span>
      </Button>

      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[600px] w-full max-w-[440px] flex-col overflow-hidden border border-border bg-card shadow-2xl sm:bottom-20 sm:right-5 sm:rounded-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="font-display text-sm font-bold uppercase tracking-wider">
                  Station assistant
                </span>
              </div>
              <p className="cc-mono truncate text-[10px] text-muted-foreground">
                {stationLabel} context injected - general knowledge enabled
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Copy last answer" onClick={copyLast}>
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Retry last question"
                disabled={busy || lastQuestion.length === 0}
                onClick={() => void submit(lastQuestion)}
              >
                <RefreshCw className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  I am your guide through {stationLabel}: ask where something is, what to open next or
                  how a screen is meant to be used, and the answer names the screen and the steps.
                  Ask about continuity risk, incidents, power headroom, the water path or the local
                  forecast and answers are grounded in live {stationLabel} telemetry. Ask anything else -
                  polar science, engineering, definitions, history - and it answers as a general
                  assistant instead of refusing.
                </p>
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submit(suggestion)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
                <div className="cc-label pt-1 text-[9px]">General questions</div>
                {GENERAL_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void submit(suggestion)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "rounded-md border px-3 py-2 text-xs leading-relaxed",
                  message.role === "user"
                    ? "ml-6 border-primary/30 bg-primary/5 text-foreground"
                    : "mr-2 border-border bg-background text-foreground",
                )}
              >
                {message.role === "assistant" ? (
                  <TypedBubble content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
                {message.model && (
                  <div className="cc-mono mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground">
                    <span>{message.model}</span>
                    {typeof message.elapsedMs === "number" && (
                      <span>{message.elapsedMs === 0 ? "instant" : `${(message.elapsedMs / 1000).toFixed(1)}s`}</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {STAGES[stage]}
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about the station, or anything else"
                className="h-9 min-w-0 flex-1 rounded border border-border bg-background px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
                <Send className="size-4" />
              </Button>
            </form>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border text-[9px] text-muted-foreground">
                console guide
              </Badge>
              <Badge variant="outline" className="border-border text-[9px] text-muted-foreground">
                telemetry + incidents + continuity + microgrid + weather
              </Badge>
              <Badge variant="outline" className="border-border text-[9px] text-muted-foreground">
                general knowledge enabled
              </Badge>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
