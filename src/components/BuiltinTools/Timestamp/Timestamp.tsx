import { useEffect, useState } from "react";
import { Clock, Copy } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

interface Parsed {
  ms: number;
  valid: boolean;
  kind: string;
}

function parseInput(raw: string): Parsed {
  const s = raw.trim();
  if (!s) return { ms: 0, valid: false, kind: "" };
  if (/^\d{10}$/.test(s)) return { ms: Number(s) * 1000, valid: true, kind: "UNIX SECONDS" };
  if (/^\d{13}$/.test(s)) return { ms: Number(s), valid: true, kind: "UNIX MILLISECONDS" };
  if (/^\d{16}$/.test(s)) return { ms: Number(s) / 1000, valid: true, kind: "UNIX MICROSECONDS" };
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return { ms: iso, valid: true, kind: "ISO 8601" };
  return { ms: 0, valid: false, kind: "" };
}

const fmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "full",
  timeStyle: "long",
});

const fmtShort = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function Timestamp() {
  const [raw, setRaw] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const parsed = parseInput(raw);
  const date = parsed.valid ? new Date(parsed.ms) : null;

  const fields = date
    ? [
        { label: "Human (local)", value: fmt.format(date) },
        { label: "Short", value: fmtShort.format(date) },
        { label: "ISO 8601", value: date.toISOString() },
        { label: "Unix seconds", value: String(Math.floor(date.getTime() / 1000)) },
        { label: "Unix milliseconds", value: String(date.getTime()) },
        { label: "Relative", value: relativeTime(parsed.ms) },
        { label: "Day of year", value: `${Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)} / 365 (${date.getFullYear()})` },
        { label: "Time zone", value: Intl.DateTimeFormat().resolvedOptions().timeZone },
        { label: "Week number", value: `Week ${weekNumber(date)}` },
      ]
    : [];

  function relativeTime(ms: number): string {
    const diff = ms - Date.now();
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    if (abs < 60000) return rtf.format(Math.round(diff / 1000), "second");
    if (abs < 3600000) return rtf.format(Math.round(diff / 60000), "minute");
    if (abs < 86400000) return rtf.format(Math.round(diff / 3600000), "hour");
    if (abs < 604800000) return rtf.format(Math.round(diff / 86400000), "day");
    return rtf.format(Math.round(diff / 604800000), "week");
  }

  function weekNumber(d: Date): number {
    const onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <ToolShell
      crumb="TIMESTAMP"
      title="The clock."
      tagline="Unix seconds, milliseconds, ISO — convert any timestamp into everything else. Time, decoded."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Input
            <Clock className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
            placeholder="1755273600 or 1755273600000 or 2026-08-15T10:00:00Z…"
            className="mt-4 w-full rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-sm text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRaw(String(Math.floor(now / 1000)))}
              className="uppercase"
            >
              Now (seconds)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setRaw(String(now))} className="uppercase">
              Now (ms)
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setRaw(new Date().toISOString())} className="uppercase">
              Now (ISO)
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                parsed.valid ? "bg-green" : raw ? "bg-red" : "bg-ink/20",
              )}
            />
            {parsed.valid ? `[ OK ] DETECTED AS ${parsed.kind}` : raw ? "[ ERR ] UNRECOGNIZED FORMAT" : "[ IDLE ] WAITING FOR INPUT"}
          </p>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Decoded
          </h2>
          {fields.length === 0 ? (
            <p className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-6 text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
              Decoded fields appear here
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {fields.map((f) => (
                <li
                  key={f.label}
                  className="group flex items-center justify-between gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                      {f.label}
                    </p>
                    <p className="break-all font-mono text-xs font-bold text-ink">{f.value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copy(f.value)}
                    className="rounded-md border-2 border-ink p-1.5 text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/60"
                    aria-label={`Copy ${f.label}`}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        All conversions done locally with the Intl API — no server, no clock syncing.
      </p>
    </ToolShell>
  );
}