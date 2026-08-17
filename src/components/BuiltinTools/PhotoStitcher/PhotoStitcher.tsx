import { useRef, useState } from "react";
import { Download, ImagePlus, Rows3 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

type Item = { id: number; file: File; url: string; w: number; h: number };

export function PhotoStitcher() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [vertical, setVertical] = useState(true);
  const [spacing, setSpacing] = useState(0);
  const [gapColor, setGapColor] = useState<"white" | "transparent">("white");
  const [maxW, setMaxW] = useState(1200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const add = async (files: FileList | null) => {
    if (!files) return;
    const fresh: Item[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(f);
      const el = new Image();
      await new Promise<void>((resolve) => {
        el.onload = () => resolve();
        el.onerror = () => resolve();
        el.src = url;
      });
      fresh.push({ id: Date.now() + Math.random(), file: f, url, w: el.naturalWidth, h: el.naturalHeight });
    }
    if (fresh.length === 0) {
      setError("NO IMAGE FILES");
      return;
    }
    setItems((prev) => [...prev, ...fresh]);
    setError(null);
    setDone(null);
  };

  const remove = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDone(null);
  };

  const move = (id: number, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const stitch = async () => {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const imgs = await Promise.all(
        items.map(
          (it) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const el = new Image();
              el.onload = () => resolve(el);
              el.onerror = () => reject(new Error("BROKEN IMAGE"));
              el.src = it.url;
            }),
        ),
      );

      const scale = imgs.map((el) => maxW / el.naturalWidth);
      const gap = Math.round(spacing);
      const canvas = document.createElement("canvas");
      if (vertical) {
        const width = Math.round(Math.min(maxW, Math.max(...imgs.map((el) => el.naturalWidth))));
        const height = Math.round(
          imgs.reduce((s, el, i) => s + el.naturalHeight * scale[i], 0) + gap * (imgs.length - 1),
        );
        canvas.width = width;
        canvas.height = height;
      } else {
        const height = Math.round(Math.min(maxW, Math.max(...imgs.map((el) => el.naturalHeight))));
        const width = Math.round(
          imgs.reduce((s, el, i) => s + el.naturalWidth * scale[i], 0) + gap * (imgs.length - 1),
        );
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d")!;
      if (gapColor === "white") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      let cursor = 0;
      imgs.forEach((el, i) => {
        const w = Math.round(el.naturalWidth * scale[i]);
        const h = Math.round(el.naturalHeight * scale[i]);
        if (vertical) {
          ctx.drawImage(el, 0, cursor, w, h);
          cursor += h + gap;
        } else {
          ctx.drawImage(el, cursor, 0, w, h);
          cursor += w + gap;
        }
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("EXPORT FAILED");
      const a = document.createElement("a");
      a.download = `fcuk-stitch-${vertical ? "v" : "h"}.png`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(`[ OK ] ${items.length} PHOTOS → ONE ${canvas.width}×${canvas.height} STRIP — ${(blob.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stitch failed.");
    } finally {
      setBusy(false);
    }
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
      crumb="PHOTO-STITCHER"
      title="The strip mill."
      tagline="Stack any number of photos into one long vertical or horizontal strip — screenshots into a scroll, receipts into a column. The app stores sell this per-picture: Pic Stitch Pro $34.99/yr, Photo Stitch Pro $29.99, Stiiitch charges 99 cents just to drop the watermark."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The photos</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              Pick photos — pick several, order matters
            </p>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              Top of the list becomes the top of the strip
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />

          <ul className="mt-4 space-y-2">
            {items.map((it, idx) => (
              <li key={it.id} className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                <span className="w-6 shrink-0 text-center font-mono text-[10px] font-bold text-ink/40">{idx + 1}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-ink">{it.file.name}</span>
                <span className="shrink-0 font-mono text-[10px] font-bold text-ink/40">
                  {it.w}×{it.h}
                </span>
                <button
                  type="button"
                  onClick={() => move(it.id, -1)}
                  disabled={idx === 0}
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(it.id, 1)}
                  disabled={idx === items.length - 1}
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink hover:bg-red/30"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="rounded-md border-2 border-dashed border-ink/30 p-4 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink/30">
                No photos yet — the strip builds top to bottom
              </li>
            )}
          </ul>

          <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The strip</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVertical(true)}
              className={`flex items-center justify-center gap-2 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-[background-color,box-shadow] duration-200 ease-brutal ${
                vertical ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/40"
              }`}
            >
              <Rows3 className="h-4 w-4" aria-hidden="true" />
              Vertical
            </button>
            <button
              type="button"
              onClick={() => setVertical(false)}
              className={`flex items-center justify-center gap-2 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-[background-color,box-shadow] duration-200 ease-brutal ${
                !vertical ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/40"
              }`}
            >
              <Rows3 className="h-4 w-4 rotate-90" aria-hidden="true" />
              Horizontal
            </button>
          </div>
          {slider("Gap between photos (px)", spacing, 0, 50, 1, setSpacing)}
          {slider("Max strip width (px)", maxW, 400, 2000, 50, setMaxW)}

          <div className="mt-3 flex gap-1.5">
            {(["white", "transparent"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setGapColor(c)}
                className={`flex-1 rounded-md border-2 border-ink px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-[background-color] duration-200 ease-brutal ${
                  gapColor === c ? "bg-yellow" : "bg-surface-muted hover:bg-yellow/40"
                }`}
              >
                {c} gap
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The strip</h2>

          <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
            <div className="text-center">
              <Rows3 className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                One long PNG lands here — every photo width-normalized to the strip
              </p>
            </div>
          </div>

          <Button onClick={() => void stitch()} disabled={busy || items.length === 0} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy ? "Stitching…" : `Stitch ${items.length || ""} photo${items.length === 1 ? "" : "s"} → PNG`}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            No smart-alignment guesswork, no subscription — photos join exactly as ordered, at full
            resolution, watermark-free.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}