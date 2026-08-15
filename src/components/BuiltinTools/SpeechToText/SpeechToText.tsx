import { useEffect, useRef, useState } from "react";
import { Mic, Square, Copy, Download } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognition(): RecognitionLike | null {
  const w = window as unknown as Record<string, unknown>;
  const Ctor =
    (w.SpeechRecognition as (new () => RecognitionLike) | undefined) ||
    (w.webkitSpeechRecognition as (new () => RecognitionLike) | undefined);
  return Ctor ? new Ctor() : null;
}

export function SpeechToText() {
  const [supported] = useState(() => !!getRecognition());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  const toggle = () => {
    const rec = recRef.current ?? getRecognition();
    if (!rec) return;
    if (listening) {
      rec.stop();
      return;
    }
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r[0] && r[0].transcript) {
          if (i === e.results.length - 1 && !isFinalResult(e, i)) {
            setInterim(r[0].transcript);
          } else {
            final += r[0].transcript;
          }
        }
      }
      if (final) {
        setTranscript((t) => (t ? t.trimEnd() + " " : "") + final.trimStart());
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Microphone blocked — allow mic access for this site."
          : e.error === "no-speech"
            ? "No speech heard. Try again?"
            : `Recognition error: ${e.error}`,
      );
      setListening(false);
    };
    setError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  };

  function isFinalResult(e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }, i: number) {
    const results = e.results as unknown as Array<{ isFinal: boolean }>;
    return Boolean(results[i]?.isFinal);
  }

  const copy = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain" });
    const a = document.createElement("a");
    a.download = "fcuk-transcript.txt";
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  return (
    <ToolShell
      crumb="SPEECH-TO-TEXT"
      title="The stenographer."
      tagline="Speak, get text. Live transcription in your browser — no minute limits, no account."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Microphone
            <Mic className="h-4 w-4" aria-hidden="true" />
          </h2>
          {supported ? (
            <>
              <button
                type="button"
                onClick={toggle}
                className={cn(
                  "mt-4 flex w-full flex-col items-center gap-3 rounded-lg border-[3px] border-ink px-4 py-10 transition-[background-color,shadow,transform] duration-200 ease-brutal",
                  listening
                    ? "animate-pulse bg-red text-ink shadow-brutal-md"
                    : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                <span className={cn("grid h-16 w-16 place-items-center rounded-full border-4 border-ink", listening ? "bg-surface" : "bg-yellow")}>
                  {listening ? <Square className="h-7 w-7" aria-hidden="true" /> : <Mic className="h-7 w-7" aria-hidden="true" />}
                </span>
                <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
                  {listening ? "[ LIVE ] CLICK TO STOP" : "CLICK TO START"}
                </p>
              </button>
              {listening && interim && (
                <p className="mt-3 rounded-md border-2 border-ink bg-ink px-3 py-2 font-mono text-xs italic text-paper/70">
                  {interim}…
                </p>
              )}
              {error && (
                <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  {error}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] Speech recognition isn't available here — try Chrome or Edge.
            </p>
          )}
          <p className="mt-4 rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
            Uses the browser's native speech engine. Audio is processed in-browser — nothing is uploaded for
            someone to sell.
          </p>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Transcript</h2>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            spellCheck={false}
            placeholder="Your words land here, live…"
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!transcript} className="uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="sm" onClick={download} disabled={!transcript} className="uppercase">
              <Download className="h-4 w-4" aria-hidden="true" /> .txt
            </Button>
            <p className="ml-auto self-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              {transcript.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Unlimited minutes. The Whisper-app subscription you didn't buy.
      </p>
    </ToolShell>
  );
}