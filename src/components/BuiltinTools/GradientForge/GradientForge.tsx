import { useMemo, useState } from "react";
import { Blend, Copy, Plus, X } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type GradientType = "linear" | "radial" | "conic";

const PRESETS: Record<string, string[]> = {
  Brutal: ["#111111", "#FFD84D"],
  Sunset: ["#FF5A5F", "#FFD84D"],
  Ocean: ["#4D8DFF", "#65D68A"],
  Lime: ["#65D68A", "#FFD84D"],
  Crimson: ["#FF5A5F", "#111111"],
  Skyline: ["#4D8DFF", "#FFD84D", "#FF5A5F"],
};

export function GradientForge() {
  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<string[]>(["#111111", "#FFD84D"]);
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => {
    const list = stops.map((s, i) => `${s} ${Math.round((i / (stops.length - 1)) * 100)}%`).join(", ");
    if (type === "linear") return `background: linear-gradient(${angle}deg, ${list});`;
    if (type === "radial") return `background: radial-gradient(circle at center, ${list});`;
    return `background: conic-gradient(from ${angle}deg, ${list});`;
  }, [type, angle, stops]);

  const setStop = (i: number, value: string) => {
    setStops((prev) => prev.map((s, idx) => (idx === i ? value : s)));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="GRADIENT-FORGE"
      title="The blender."
      tagline="Linear, radial or conic gradients with any stops you like. Mix, preview, copy the CSS."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Settings
            <Blend className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["linear", "radial", "conic"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  type === t ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {type !== "radial" && (
            <div className="mt-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Angle — {angle}°
              </p>
              <input
                type="range"
                min={0}
                max={360}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </div>
          )}

          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Stops
            </p>
            <div className="mt-2 space-y-2">
              {stops.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s}
                    onChange={(e) => setStop(i, e.target.value.toUpperCase())}
                    className="h-9 w-12 cursor-pointer rounded-sm border-2 border-ink bg-surface-muted p-0.5"
                    aria-label={`Stop ${i + 1} color`}
                  />
                  <input
                    value={s}
                    onChange={(e) => setStop(i, e.target.value)}
                    spellCheck={false}
                    className="w-32 rounded-md border-2 border-ink bg-surface-muted p-2 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
                  />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                    {Math.round((i / (stops.length - 1)) * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setStops((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={stops.length <= 2}
                    className="ml-auto rounded-md border-2 border-ink p-1.5 text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-red disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Remove stop"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStops((prev) => [...prev, prev[prev.length - 1]])}
              disabled={stops.length >= 6}
              className="mt-3 uppercase"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add stop
            </Button>
          </div>

          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Presets
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([name, colors]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setStops(colors);
                    if (colors.length === 2) setType("linear");
                  }}
                  title={name}
                  className="flex h-9 items-center gap-1 rounded-md border-2 border-ink p-1 transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/30"
                >
                  <span
                    className="h-5 w-5 rounded-sm border border-ink/30"
                    style={{ background: `linear-gradient(135deg, ${colors.join(", ")})` }}
                  />
                  <span className="px-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] The blend
          </h2>
          <div className="mt-4 h-56 rounded-md border-2 border-ink" style={{ background: css }} />
          <div className="mt-4 flex-1 rounded-md border-2 border-ink bg-surface-muted p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">CSS</p>
            <pre className="mt-2 overflow-auto font-mono text-[11px] text-ink">{css}</pre>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void copy()} className="mt-3 uppercase">
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? "Copied" : "Copy CSS"}
          </Button>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Gradients generated in your tab — paste the CSS anywhere.
      </p>
    </ToolShell>
  );
}