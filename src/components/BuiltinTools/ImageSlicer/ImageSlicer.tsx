import { useRef, useState } from "react";
import { Download, Grid2x2, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

function pngBytes(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL("image/png");
  const bin = atob(dataUrl.split(",")[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function ImageSlicer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

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

  const slice = async () => {
    if (!img) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { zipSync } = await import("fflate");
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const cw = w / cols;
      const ch = h / rows;
      const files: Record<string, Uint8Array> = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(cw);
          canvas.height = Math.floor(ch);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            Math.round(c * cw),
            Math.round(r * ch),
            Math.round(cw),
            Math.round(ch),
            0,
            0,
            Math.floor(cw),
            Math.floor(ch),
          );
          files[`${name.replace(/\.[^.]+$/, "")}-r${r + 1}c${c + 1}.png`] = pngBytes(canvas);
        }
      }
      const zipped = zipSync(files);
      const blob = new Blob([zipped], { type: "application/zip" });
      const a = document.createElement("a");
      a.download = `fcuk-slices-${cols}x${rows}.zip`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(`[ OK ] ${cols * rows} SLICES IN ONE ZIP — ${(blob.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Slice failed.");
    } finally {
      setBusy(false);
    }
  };

  const slider = (label: string, value: number, max: number, onChange: (v: number) => void) => (
    <label className="mt-3 block">
      <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
        {label}
        <span className="text-ink">{value}</span>
      </span>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-yellow"
      />
    </label>
  );

  return (
    <ToolShell
      crumb="IMAGE-SLICER"
      title="The chopper."
      tagline="Cut one image into a perfect grid — 9 squares for an Instagram post, tiles for a mosaic, rows for a print run. The slice sites watermark free exports and cap the ZIP behind signup; cutting a rectangle into rectangles is math."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The image</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {img ? name : "Pick an image"}
            </p>
            {img && (
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {img.naturalWidth}×{img.naturalHeight}px → {cols}×{rows} = {cols * rows} slices
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

          <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The grid</h2>
          <div className="mt-4 flex items-center gap-3 rounded-md border-2 border-ink bg-surface-muted p-3">
            <Grid2x2 className="h-6 w-6 shrink-0 text-ink/40" aria-hidden="true" />
            <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className="text-right font-mono text-xs font-bold text-ink">{cols} cols</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">×</span>
              <span className="font-mono text-xs font-bold text-ink">{rows} rows</span>
            </div>
          </div>
          {slider("Columns", cols, 5, setCols)}
          {slider("Rows", rows, 5, setRows)}
          {slider("Grid", cols * rows, 25, (v) => {
            const c = Math.max(1, Math.round(Math.sqrt(v)));
            setCols(c);
            setRows(Math.max(1, Math.round(v / c)));
          })}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The slices</h2>

          {img ? (
            <div className="mt-4 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-2">
              <img
                src={img.src}
                alt="Input preview with grid overlay"
                className="mx-auto max-w-full"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  objectFit: "contain",
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent 0, transparent calc(100%/" +
                    rows +
                    " - 2px), rgba(17,17,17,.25) calc(100%/" +
                    rows +
                    " - 2px), rgba(17,17,17,.25) 100%/" +
                    rows +
                    "), repeating-linear-gradient(90deg, transparent 0, transparent calc(100%/" +
                    cols +
                    " - 2px), rgba(17,17,17,.25) calc(100%/" +
                    cols +
                    " - 2px), rgba(17,17,17,.25) 100%/" +
                    cols +
                    ")",
                }}
              />
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The grid preview lands here — slices come down as one ZIP
              </p>
            </div>
          )}

          <Button onClick={() => void slice()} disabled={busy || !img} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy ? "Slicing…" : `Slice into ${cols * rows} PNGs → ZIP`}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Full-resolution PNG slices, named row/column so your post order survives the ZIP — no watermark,
            no signup, no 5 MB upload cap.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}