import { useMemo, useRef, useState } from "react";
import { Copy, Palette } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface Swatch {
  hex: string;
  rgb: string;
  count: number;
}

function quantize(data: Uint8ClampedArray, bins: number): Map<number, number> {
  const counts = new Map<number, number>();
  const step = Math.floor(256 / bins);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = Math.min(255, Math.floor(data[i] / step) * step);
    const g = Math.min(255, Math.floor(data[i + 1] / step) * step);
    const b = Math.min(255, Math.floor(data[i + 2] / step) * step);
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function hexOf(r: number, g: number, b: number): string {
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function PaletteSnatcher() {
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [count, setCount] = useState(8);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File) => {
    setError(null);
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const counts = quantize(data, 16);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const top = sorted.slice(0, count);
      const total = top.reduce((acc, [, c]) => acc + c, 0);
      setSwatches(
        top.map(([key, c]) => {
          const r = (key >> 16) & 0xff;
          const g = (key >> 8) & 0xff;
          const b = key & 0xff;
          return { hex: hexOf(r, g, b), rgb: `${r}, ${g}, ${b}`, count: Math.round((c / total) * 100) };
        }),
      );
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setError("COULD NOT READ THAT IMAGE");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const css = useMemo(
    () =>
      swatches.length > 0
        ? `:root {\n${swatches.map((s, i) => `  --palette-${i + 1}: ${s.hex};`).join("\n")}\n}`
        : "",
    [swatches],
  );

  const copy = async (kind: "hex" | "css", swatch?: Swatch) => {
    await navigator.clipboard.writeText(kind === "css" ? css : swatch?.hex ?? "");
    setCopied(kind === "css" ? "css" : swatch?.hex ?? null);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <ToolShell
      crumb="PALETTE-SNATCHER"
      title="The snatcher."
      tagline="Feed it an image, walk away with its color palette. Dominant colors, computed locally in your tab."
    >
      <div className="mt-10 rounded-lg border-[3px] border-dashed border-ink bg-surface p-5 text-center shadow-brutal-md">
        <Palette className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
        <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          Drop any image and steal its palette
        </p>
        <Button size="sm" className="mt-4 uppercase" onClick={() => inputRef.current?.click()}>
          Pick image
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          Palette size
        </p>
        <input
          type="range"
          min={2}
          max={24}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-48 accent-yellow"
        />
        <span className="w-10 font-mono text-xs font-bold text-ink">{count}</span>
      </div>

      {swatches.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [01] The haul
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {swatches.map((s) => (
                <div key={s.hex}>
                  <button
                    type="button"
                    onClick={() => void copy("hex", s)}
                    title="Copy hex"
                    className="group flex h-20 w-full items-end justify-center rounded-md border-2 border-ink p-1 transition-[box-shadow] duration-200 ease-brutal hover:shadow-brutal-sm"
                    style={{ backgroundColor: s.hex }}
                    aria-label={`Copy ${s.hex}`}
                  >
                    <span className="rounded-sm bg-paper/90 px-1 font-mono text-[10px] font-bold text-ink">
                      {copied === s.hex ? "COPIED" : s.hex}
                    </span>
                  </button>
                  <p className="mt-1 text-center font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
                    {s.count}% · rgb({s.rgb})
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              {swatches.reduce((a, s) => a + s.count, 0)}% of pixels · top {swatches.length} colors
            </p>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] CSS variables
            </h2>
            <pre className="mt-4 overflow-auto rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green">
              {css || "// no palette yet"}
            </pre>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy("css")}
              disabled={!css}
              className="mt-3 uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied === "css" ? "Copied" : "Copy CSS"}
            </Button>
          </section>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Dominant-color extraction with color quantization — all computed in your tab.
      </p>
    </ToolShell>
  );
}