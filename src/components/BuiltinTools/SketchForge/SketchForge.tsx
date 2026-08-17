import { useEffect, useRef, useState } from "react";
import { Brush, Download, Pencil, PenTool, Palette, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type Style = "pencil" | "ink" | "charcoal" | "comic";
type Paper = "white" | "cream";

const PAPER: Record<Paper, [number, number, number]> = {
  white: [255, 255, 255],
  cream: [245, 240, 232],
};
const INK: [number, number, number] = [26, 26, 26];

const STYLES: { id: Style; label: string; icon: typeof Pencil }[] = [
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "ink", label: "Ink pen", icon: PenTool },
  { id: "charcoal", label: "Charcoal", icon: Brush },
  { id: "comic", label: "Comic", icon: Palette },
];

const MAX_EDGE = 2000;

function toGray(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return out;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice();
  let cur = src;
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(cur.length);
    const norm = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += cur[row + Math.min(Math.max(x, 0), w - 1)];
      for (let x = 0; x < w; x++) {
        next[row + x] = acc * norm;
        acc += cur[row + Math.min(x + r + 1, w - 1)] - cur[row + Math.max(x - r, 0)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += next[Math.min(Math.max(y, 0), h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        const idx = y * w + x;
        const v = acc * norm;
        acc += next[Math.min(y + r + 1, h - 1) * w + x] - next[Math.max(y - r, 0) * w + x];
        cur[idx] = v;
      }
    }
    const tmp = cur;
    cur = next;
    next.set(tmp);
  }
  return cur;
}

function sobel(gray: Float32Array, w: number, h: number): Float32Array {
  const mag = new Float32Array(gray.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = gray[i - w - 1], t = gray[i - w], tr = gray[i - w + 1];
      const l = gray[i - 1], r = gray[i + 1];
      const bl = gray[i + w - 1], b = gray[i + w], br = gray[i + w + 1];
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;
      mag[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return mag;
}

function render(
  img: HTMLImageElement,
  style: Style,
  opts: { strength: number; threshold: number; levels: number; paper: Paper },
): HTMLCanvasElement {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(img, 0, 0, w, h);
  const data = sctx.getImageData(0, 0, w, h).data;
  const gray = toGray(data);
  const r = Math.max(2, Math.round(Math.min(w, h) / 200));
  const blur = boxBlur(gray, w, h, style === "charcoal" ? r * 3 : r);
  const [pr, pg, pb] = PAPER[opts.paper];
  const [ir, ig, ib] = INK;
  const out = new Uint8ClampedArray(data.length);

  for (let p = 0; p < gray.length; p++) {
    let dark: number;
    if (style === "pencil") {
      let v = (gray[p] * 255) / Math.max(blur[p], 1);
      const c = 0.5 + opts.strength;
      v = 255 * Math.pow(v / 255, c);
      dark = 255 - Math.min(v, 255);
    } else if (style === "charcoal") {
      const base = 255 - gray[p];
      const smudge = blur[p] / 255;
      dark = base * (0.35 + 0.65 * smudge) * opts.strength;
    } else if (style === "comic") {
      const n = Math.max(2, Math.round(opts.levels));
      const band = Math.round((gray[p] / 255) * (n - 1)) / (n - 1);
      dark = 255 - band * 255;
    } else {
      dark = 0;
    }
    const i = p * 4;
    out[i] = pr + ((ir - pr) * dark) / 255;
    out[i + 1] = pg + ((ig - pg) * dark) / 255;
    out[i + 2] = pb + ((ib - pb) * dark) / 255;
    out[i + 3] = 255;
  }

  if (style === "ink" || style === "comic") {
    const mag = sobel(gray, w, h);
    const thresh = style === "ink" ? opts.threshold : opts.threshold * 0.6;
    for (let p = 0; p < mag.length; p++) {
      if (mag[p] > thresh) {
        const i = p * 4;
        out[i] = ir;
        out[i + 1] = ig;
        out[i + 2] = ib;
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return canvas;
}

export function SketchForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [style, setStyle] = useState<Style>("pencil");
  const [strength, setStrength] = useState(1.5);
  const [threshold, setThreshold] = useState(110);
  const [levels, setLevels] = useState(4);
  const [paper, setPaper] = useState<Paper>("white");
  const [error, setError] = useState<string | null>(null);

  const load = (f: File) => {
    setError(null);
    if (!f.type.startsWith("image/")) {
      setError("NOT AN IMAGE");
      return;
    }
    const url = URL.createObjectURL(f);
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setName(f.name);
      URL.revokeObjectURL(url);
    };
    el.onerror = () => {
      setError("COULD NOT READ IMAGE");
      URL.revokeObjectURL(url);
    };
    el.src = url;
  };

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !img) return;
    const out = render(img, style, { strength, threshold, levels, paper });
    canvas.width = out.width;
    canvas.height = out.height;
    canvas.getContext("2d")!.drawImage(out, 0, 0);
  }, [img, style, strength, threshold, levels, paper]);

  const download = () => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = name.replace(/\.[^.]+$/, "") + `-${style}-sketch.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <label className="mt-3 block">
      <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
        {label}
        <span className="text-ink">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-yellow"
      />
    </label>
  );

  return (
    <ToolShell
      crumb="SKETCH-FORGE"
      title="The sketchbook."
      tagline="Turn a photo into a pencil, ink-pen, charcoal or comic sketch — computed pixel by pixel in your tab. The AI-sketch sites meter every generation behind credits; the math behind the effect is a blend mode and an edge filter."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The photo</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {img ? name : "Pick a photo"}
            </p>
            {img && (
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {img.naturalWidth}×{img.naturalHeight}px — redraws live below
              </p>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) load(f);
              e.target.value = "";
            }}
          />

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}

          <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The style</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {STYLES.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-[background-color,box-shadow] duration-200 ease-brutal",
                    style === s.id ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/40",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {style === "pencil" && slider("Pencil pressure", strength, 0.5, 3, 0.1, setStrength)}
          {style === "ink" && slider("Line threshold", threshold, 30, 220, 5, setThreshold)}
          {style === "comic" && (
            <>
              {slider("Tone levels", levels, 2, 8, 1, setLevels)}
              {slider("Line threshold", threshold, 30, 220, 5, setThreshold)}
            </>
          )}
          {style === "charcoal" && slider("Charcoal weight", strength, 0.4, 2.5, 0.1, setStrength)}

          <div className="mt-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Paper</span>
            <div className="mt-1.5 flex gap-2">
              {(["white", "cream"] as Paper[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPaper(p)}
                  className={cn(
                    "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal",
                    paper === p ? "bg-yellow" : "bg-surface-muted hover:bg-yellow/40",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The sketch</h2>

          {img ? (
            <>
              <div className="mt-4 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-2">
                <canvas ref={previewRef} className="mx-auto max-w-full" />
              </div>
              <Button onClick={download} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download PNG
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The sketch appears here — no credits, no watermark, no account
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Pencil = grayscale + blur + color-dodge blend. Ink = Sobel edge detection. Charcoal = smudged
            blur. Comic = posterized tones + lines. All of it is a few screen pixels away from free.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}