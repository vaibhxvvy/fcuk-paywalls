import { useRef, useState } from "react";
import { Scissors, Download } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

interface ImgState {
  url: string;
  el: HTMLImageElement;
  w: number;
  h: number;
}

function sampleBg(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const counts = new Map<number, number>();
  const walk = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const q = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    counts.set(q, (counts.get(q) ?? 0) + 1);
  };
  for (let x = 0; x < w; x++) {
    walk(x, 0);
    walk(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    walk(0, y);
    walk(w - 1, y);
  }
  let best = 0, bestCount = -1;
  for (const [q, c] of counts) {
    if (c > bestCount) {
      bestCount = c;
      best = q;
    }
  }
  return [(best >> 8) & 0xf0, (best >> 4) & 0xf0, best & 0xf0];
}

function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function removeBackground(
  canvas: HTMLCanvasElement,
  tolerance: number,
  manual: [number, number, number] | null,
): void {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const bg = manual ?? sampleBg(data, w, h);

  const visited = new Uint8Array(w * h);
  const queueX = new Int32Array(w * h);
  const queueY = new Int32Array(w * h);
  let head = 0, tail = 0;

  const push = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    queueX[tail] = x;
    queueY[tail] = y;
    tail++;
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  const tol2 = tolerance * tolerance * 3;
  while (head < tail) {
    const x = queueX[head];
    const y = queueY[head];
    head++;
    const i = (y * w + x) * 4;
    const d = distance(data[i], data[i + 1], data[i + 2], bg[0], bg[1], bg[2]);
    if (d * d > tol2) continue;
    data[i + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  const feather = Math.max(1, Math.round(tolerance / 12));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] !== 0) continue;
      for (let fy = 1; fy <= feather; fy++) {
        if (y - fy < 0) break;
        const j = ((y - fy) * w + x) * 4;
        if (data[j + 3] !== 0) {
          const a = 255 * (1 - fy / (feather + 1));
          if (a > data[j + 3] * 0.5) data[j + 3] = Math.max(data[j + 3], a);
          break;
        }
      }
      for (let fx = 1; fx <= feather; fx++) {
        if (x - fx < 0) break;
        const j = (y * w + (x - fx)) * 4;
        if (data[j + 3] !== 0) {
          const a = 255 * (1 - fx / (feather + 1));
          if (a > data[j + 3] * 0.5) data[j + 3] = Math.max(data[j + 3], a);
          break;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export function BackgroundRemover() {
  const [img, setImg] = useState<ImgState | null>(null);
  const [tolerance, setTolerance] = useState(40);
  const [manual, setManual] = useState<[number, number, number] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outUrlRef = useRef<string | null>(null);

  const pick = (file: File) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const maxDim = 1600;
      const ratio = Math.min(1, maxDim / Math.max(el.naturalWidth, el.naturalHeight));
      setImg({ url, el, w: Math.round(el.naturalWidth * ratio), h: Math.round(el.naturalHeight * ratio) });
      setManual(null);
      runRemove(el, Math.round(el.naturalWidth * ratio), Math.round(el.naturalHeight * ratio), 40, null);
    };
    el.src = url;
  };

  const runRemove = (
    el: HTMLImageElement,
    w: number,
    h: number,
    tol: number,
    man: [number, number, number] | null,
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(el, 0, 0, w, h);
    removeBackground(canvas, tol, man);
    if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    outUrlRef.current = canvas.toDataURL("image/png");
  };

  const reprocess = () => {
    if (!img || busy) return;
    setBusy(true);
    requestAnimationFrame(() => {
      runRemove(img.el, img.w, img.h, tolerance, manual);
      setBusy(false);
    });
  };

  const download = () => {
    if (!outUrlRef.current) return;
    const a = document.createElement("a");
    a.href = outUrlRef.current;
    a.download = "fcuk-nobg.png";
    a.click();
  };

  return (
    <ToolShell
      crumb="BACKGROUND-REMOVER"
      title="The cutter."
      tagline="Strip solid backgrounds to transparent — unlimited cuts, no credit packs."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Scissors className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mt-4 w-full rounded-lg border-[3px] border-ink px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal",
              img ? "bg-surface-muted hover:bg-yellow/30" : "border-dashed",
            )}
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {img ? "Pick another image" : "Drop or pick an image"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Best on solid or plain backgrounds · stays in your tab
            </p>
          </button>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Tolerance — {tolerance}
              </span>
              <input
                type="range"
                min={5}
                max={120}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setManual(null);
                  reprocess();
                }}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  manual === null ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Auto (edge color)
              </button>
              <button
                type="button"
                onClick={() => setManual([255, 255, 255])}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  manual !== null ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => setManual([0, 0, 0])}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  manual !== null ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Black
              </button>
              <Button variant="secondary" size="sm" onClick={reprocess} disabled={!img || busy} className="ml-auto uppercase">
                Reprocess
              </Button>
            </div>
            <p className="rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
              Flood-fill removal: perfect for product shots and scans on plain
              backgrounds. Hair, fur and busy scenes need an AI — that's the
              remove.bg credit system we refuse to clone.
            </p>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Result</h2>
          {outUrlRef.current ? (
            <>
              <div className="mt-4 grid flex-1 place-items-center rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] p-4">
                <img
                  src={outUrlRef.current}
                  alt="Background removed preview"
                  className="max-h-[26rem] w-auto border-2 border-ink object-contain"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  {img ? `${img.w} × ${img.h}px · transparent PNG` : ""}
                </p>
                <Button onClick={download} size="sm" className="uppercase">
                  <Download className="h-4 w-4" aria-hidden="true" /> PNG
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Cutout appears here
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Unlimited previews and downloads — your image never hits a server or a credit meter.
      </p>
    </ToolShell>
  );
}