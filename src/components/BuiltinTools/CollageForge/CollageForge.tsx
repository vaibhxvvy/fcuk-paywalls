import { useEffect, useRef, useState } from "react";
import { Download, Images, LayoutGrid, X } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

interface GridPreset {
  cols: number;
  rows: number;
  label: string;
}

const GRIDS: GridPreset[] = [
  { cols: 2, rows: 2, label: "2 × 2" },
  { cols: 3, rows: 2, label: "3 × 2" },
  { cols: 3, rows: 3, label: "3 × 3" },
];

const BG_SWATCHES = ["#ffffff", "#f5f0e8", "#111111", "#ffd84d"];

export function CollageForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [grid, setGrid] = useState<GridPreset>(GRIDS[0]);
  const [gap, setGap] = useState(16);
  const [bg, setBg] = useState("#ffffff");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [out, setOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cap = grid.cols * grid.rows;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (images.length === 0) {
      setOut(null);
      return;
    }
    const W = 1600;
    const tile = Math.round((W - gap * (grid.cols - 1)) / grid.cols);
    const H = Math.round(tile * grid.rows + gap * (grid.rows - 1));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < grid.cols * grid.rows; i++) {
      const img = images[i];
      if (!img) continue;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (iw === 0 || ih === 0) continue;
      const x = (i % grid.cols) * (tile + gap);
      const y = Math.floor(i / grid.cols) * (tile + gap);
      if (fit === "cover") {
        const s = Math.max(tile / iw, tile / ih);
        const sw = tile / s;
        const sh = tile / s;
        ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, tile, tile);
      } else {
        const s = Math.min(tile / iw, tile / ih);
        const dw = iw * s;
        const dh = ih * s;
        ctx.drawImage(img, x + (tile - dw) / 2, y + (tile - dh) / 2, dw, dh);
      }
    }
    setOut(canvas.toDataURL("image/png"));
  }, [images, grid, gap, bg, fit]);

  const onPick = (files: FileList | null) => {
    setError(null);
    if (!files?.length) return;
    const list = Array.from(files).slice(0, cap - images.length);
    if (list.length === 0) {
      setError(`The ${grid.label} grid is full — remove a photo or pick a bigger grid.`);
      return;
    }
    list.forEach((f) => {
      const u = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        setImages((prev) => (prev.length >= cap ? prev : [...prev, img]));
      };
      img.onerror = () => URL.revokeObjectURL(u);
      img.src = u;
    });
  };

  const remove = (i: number) => {
    const img = images[i];
    if (img) URL.revokeObjectURL(img.src);
    setImages((prev) => prev.filter((_, j) => j !== i));
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out;
    a.download = `collage-${grid.cols}x${grid.rows}.png`;
    a.click();
  };

  return (
    <ToolShell
      crumb="COLLAGE-FORGE"
      title="The mosaic."
      tagline="Stack photos into a clean grid — 2×2, 3×2 or 3×3, gap and background of your choice, exported at 1600 px. The collage apps meter you per grid and watermark the free tier."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Layout
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {GRIDS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setGrid(g)}
                aria-pressed={grid.label === g.label}
                className={cn(
                  "rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  grid.label === g.label
                    ? "bg-ink text-surface shadow-brutal-sm"
                    : "bg-surface-muted text-ink/70 hover:bg-yellow/30",
                )}
              >
                {g.label}
              </button>
            ))}
            <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              {images.length}/{cap} photos
            </span>
          </div>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Gap — {gap} px
            </span>
            <input
              type="range"
              min={0}
              max={80}
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
              className="mt-2 w-full accent-ink"
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Background
            </span>
            {BG_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBg(c)}
                aria-label={`Background ${c}`}
                aria-pressed={bg === c}
                className={cn(
                  "h-7 w-7 rounded-md border-2 border-ink transition-transform duration-200 ease-brutal hover:scale-110",
                  bg === c && "shadow-brutal-sm",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="relative ml-1 flex h-7 w-7 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-ink/60 bg-surface-muted">
              <span className="sr-only">Custom background color</span>
              <input
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-10 cursor-pointer opacity-0"
              />
              <span className="pointer-events-none absolute font-mono text-[10px] font-bold text-ink/50">+</span>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Fit</span>
            {(["cover", "contain"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFit(f)}
                aria-pressed={fit === f}
                className={cn(
                  "rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  fit === f
                    ? "bg-ink text-surface shadow-brutal-sm"
                    : "bg-surface-muted text-ink/70 hover:bg-yellow/30",
                )}
              >
                {f}
              </button>
            ))}
            <p className="ml-auto text-right text-[10px] font-medium leading-tight text-ink/50">
              cover crops to fill<br />contain letterboxes
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-6 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <Images className="mx-auto h-5 w-5" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {images.length ? `Add up to ${cap - images.length} more` : "Pick photos"}
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              First {cap} picks fill the grid, left to right
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files);
              e.target.value = "";
            }}
          />

          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="group relative">
                  <img src={img.src} alt="" className="h-16 w-full rounded-sm border-2 border-ink object-cover" />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-red shadow-brutal-sm transition-transform duration-200 ease-brutal hover:scale-110"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Canvas out</h2>

          {out ? (
            <>
              <img src={out} alt="Collage preview" className="mt-4 w-full rounded-md border-2 border-ink" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={download} className="uppercase">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download PNG (1600 px)
                </Button>
                <Button variant="secondary" onClick={() => setImages([])} className="uppercase">
                  Start over
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                {images.length === 0
                  ? "The grid appears once photos are picked"
                  : "Rendering…"}
              </p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Photos never leave your machine — the canvas is the whole studio.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The freemium collage sites bill per export and stamp your name across the result; the grid math is free.
      </p>
    </ToolShell>
  );
}