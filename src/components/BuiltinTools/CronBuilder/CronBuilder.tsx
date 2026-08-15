import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

type Field = { any: boolean; allowed: Set<number> };

function parseField(str: string, min: number, max: number): Field {
  const allowed = new Set<number>();
  for (const part of str.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed === "*") {
      for (let v = min; v <= max; v++) allowed.add(v);
      continue;
    }
    const [rangePart, stepPart] = trimmed.split("/");
    const step = stepPart ? Math.max(1, Number(stepPart) || 1) : 1;
    let start: number;
    let end: number;
    if (rangePart === "*") {
      start = min;
      end = max;
    } else if (rangePart.includes("-")) {
      const [a, b] = rangePart.split("-").map(Number);
      start = a;
      end = b;
    } else {
      start = Number(rangePart);
      end = start;
    }
    if (!isFinite(start) || !isFinite(end)) continue;
    for (let v = start; v <= end; v += step) {
      if (v >= min && v <= max) allowed.add(v);
    }
  }
  return { any: allowed.size === 0 || allowed.size === max - min + 1, allowed };
}

function matches(rule: { dom: Field; dow: Field }, d: Date): boolean {
  const domMatch = rule.dom.any || rule.dom.allowed.has(d.getDate());
  const dowMatch = rule.dow.any || rule.dow.allowed.has(d.getDay());
  if (!rule.dom.any && !rule.dow.any) return domMatch || dowMatch;
  return domMatch && dowMatch;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function humanize(rule: { minute: Field; hour: Field; dom: Field; month: Field; dow: Field }): string {
  const m = rule.minute, h = rule.hour, d = rule.dom, mo = rule.month, w = rule.dow;
  const at = `At ${h.any ? "00" : [...h.allowed][0].toString().padStart(2, "0")}:${m.any ? "00" : [...m.allowed][0].toString().padStart(2, "0")}`;
  if (!w.any && w.allowed.size <= 2) {
    const days = [...w.allowed].sort().map((x) => DAYS[x]).join(" and ");
    return `${at}, on ${days}`;
  }
  if (!d.any && d.allowed.size === 1) {
    return `${at}, on day ${[...d.allowed][0]} of the month`;
  }
  if (!mo.any && mo.allowed.size === 1) {
    return `${at}, in ${MONTHS[[...mo.allowed][0] - 1]}`;
  }
  if (!m.any && m.allowed.size === 1 && h.any && d.any && mo.any && w.any) {
    return `Every hour, at minute ${[...m.allowed][0]}`;
  }
  if (m.allowed.size === 60 && h.any && d.any && mo.any && w.any) return "Every minute";
  if (!m.any && m.allowed.size === 1 && !h.any && h.allowed.size === 1 && d.any && mo.any && w.any) {
    return `Every day, ${at}`;
  }
  return at;
}

function nextRuns(expr: string, from: Date, count = 5): Date[] | null {
  try {
    const [minS, hourS, domS, monthS, dowS] = expr.split(/\s+/);
    if (!minS || !hourS || !domS || !monthS || !dowS) return null;
    const rule = {
      minute: parseField(minS, 0, 59),
      hour: parseField(hourS, 0, 23),
      dom: parseField(domS, 1, 31),
      month: parseField(monthS, 1, 12),
      dow: parseField(dowS, 0, 7),
    };
    rule.dow.allowed = new Set([...rule.dow.allowed].map((x) => (x === 7 ? 0 : x)));
    rule.dow.any = rule.dow.allowed.size === 7;

    const out: Date[] = [];
    const cursor = new Date(from);
    cursor.setSeconds(0, 0);
    const cap = from.getTime() + 1000 * 60 * 60 * 24 * 365 * 3;
    while (out.length < count) {
      cursor.setMinutes(cursor.getMinutes() + 1);
      if (cursor.getTime() > cap) break;
      if (!rule.minute.any && !rule.minute.allowed.has(cursor.getMinutes())) continue;
      if (!rule.hour.any && !rule.hour.allowed.has(cursor.getHours())) continue;
      if (!rule.month.any && !rule.month.allowed.has(cursor.getMonth() + 1)) continue;
      if (!matches({ dom: rule.dom, dow: rule.dow }, cursor)) continue;
      out.push(new Date(cursor));
    }
    return out;
  } catch {
    return null;
  }
}

const PRESETS: { name: string; expr: string }[] = [
  { name: "Every minute", expr: "* * * * *" },
  { name: "Every 5 minutes", expr: "*/5 * * * *" },
  { name: "Hourly at :30", expr: "30 * * * *" },
  { name: "Daily 09:00", expr: "0 9 * * *" },
  { name: "Weekly Mon 09:00", expr: "0 9 * * 1" },
  { name: "Monthly 1st midnight", expr: "0 0 1 * *" },
  { name: "Weekdays 08:30", expr: "30 8 * * 1-5" },
  { name: "Every 15 min work hours", expr: "*/15 9-18 * * *" },
];

export function CronBuilder() {
  const [expr, setExpr] = useState("0 9 * * 1");
  const [now, setNow] = useState(() => new Date());

  const runs = useMemo(() => nextRuns(expr, now), [expr, now]);
  const valid = runs !== null;

  return (
    <ToolShell
      crumb="CRON-BUILDER"
      title="The scheduler."
      tagline="Build a cron expression visually and see the next real run times — no server needed to check."
    >
      <div className="mt-10 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          [01] The expression
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {["minute", "hour", "day-of-month", "month", "day-of-week"].map((label, i) => (
            <div key={label} className="flex-1 basis-28">
              <p className="text-center font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">{label}</p>
              <input
                value={expr.split(/\s+/)[i] ?? "*"}
                onChange={(e) => {
                  const parts = expr.split(/\s+/);
                  parts[i] = e.target.value.trim() === "" ? "*" : e.target.value;
                  setExpr(parts.join(" "));
                }}
                spellCheck={false}
                className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-2 text-center font-mono text-sm font-bold text-ink outline-none focus:border-yellow"
              />
            </div>
          ))}
          <div className="w-full sm:flex-none sm:basis-auto">
            <p className="hidden font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50 sm:block">&nbsp;</p>
            <div
              className={cn(
                "mt-1 rounded-md border-2 border-ink px-3 py-2 text-center font-mono text-sm font-bold",
                valid ? "bg-green" : "bg-red",
              )}
            >
              {valid ? "OK" : "INVALID"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setExpr(p.expr)}
              className={cn(
                "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                expr === p.expr ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Next runs</h2>
          {valid && runs ? (
            <ul className="mt-4 space-y-2">
              {runs.map((r, i) => (
                <li key={i} className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Run #{i + 1}
                  </p>
                  <p className="font-mono text-sm font-bold text-ink">
                    {r.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    <span className="text-blue"> {r.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-4 text-center font-mono text-xs font-bold uppercase tracking-widest text-ink">
              Invalid or unsupported expression
            </p>
          )}
          <button
            type="button"
            onClick={() => setNow(new Date())}
            className="mt-4 rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            Recompute from now
          </button>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] In plain english</h2>
          {valid && runs ? (
            <p className="mt-4 rounded-md border-2 border-ink bg-yellow/30 px-4 py-3 font-mono text-sm font-bold text-ink">
              {humanize({
                minute: parseField(expr.split(/\s+/)[0], 0, 59),
                hour: parseField(expr.split(/\s+/)[1], 0, 23),
                dom: parseField(expr.split(/\s+/)[2], 1, 31),
                month: parseField(expr.split(/\s+/)[3], 1, 12),
                dow: parseField(expr.split(/\s+/)[4], 0, 7),
              })}
            </p>
          ) : (
            <p className="mt-4 rounded-md border-2 border-ink bg-surface-muted px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
              Fix the expression first
            </p>
          )}
          <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Supported syntax</p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] font-semibold text-ink/70">
              <li>* — every value</li>
              <li>5 — single value</li>
              <li>1-5 — range</li>
              <li>*/15 — step (every 15)</li>
              <li>1-5/2 — range with step</li>
              <li>0,15,30 — list</li>
              <li>Day-of-week: 0 or 7 = Sunday</li>
            </ul>
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Runs are computed minute-by-minute in your tab — the next five real fire times.
      </p>
    </ToolShell>
  );
}