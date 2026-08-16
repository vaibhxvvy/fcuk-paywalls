import { useRef, useState } from "react";
import { Download, FileImage } from "lucide-react";
import gifenc from "gifenc";
import { parseGIF, decompressFrames } from "gifuct-js";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface Info {
  frames: number;
  width: number;
  height: number;
}

const fmtSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

export function GifForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [info, setInfo] = useState<Info | null>(null);
  const [width, setWidth] = useState(480);
  const [colors, setColors] = useState(128);
  const [skip, setSkip] = useState(1);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [out, setOut] = useState<{ url: string; size: number; frames: number } | null>(null);
  const [origSize, setOrigSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const optimize = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setError(null);
    setOut(null);
    setName(file.name);
    setOrigSize(file.size);
    try {
      const buf = await file.arrayBuffer();
      const gif = parseGIF(buf);
      const raw = decompressFrames(gif, true);
      if (raw.length === 0) throw new Error("No frames found — is that really a GIF?");
      const gifW = raw[0].dims.width;
      const gifH = raw[0].dims.height;
      setInfo({ frames: raw.length, width: gifW, height: gifH });

      const h = Math.max(1, Math.round((gifH * width) / gifW));
      const full = document.createElement("canvas");
      full.width = gifW;
      full.height = gifH;
      const fctx = full.getContext("2d");
      const small = document.createElement("canvas");
      small.width = width;
      small.height = h;
      const sctx = small.getContext("2d");
      if (!fctx || !sctx) throw new Error("Canvas unavailable.");

      const { GIFEncoder, quantize, applyPalette } = gifenc;
      const enc = GIFEncoder();
      let snapshot: ImageData | null = null;
      let kept = 0;
      for (let i = 0; i < raw.length; i++) {
        const f = raw[i];
        if (f.disposalType === 3) snapshot = fctx.getImageData(0, 0, gifW, gifH);
        if (f.disposalType === 2) {
          fctx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
        }
        const patch = document.createElement("canvas");
        patch.width = f.dims.width;
        patch.height = f.dims.height;
        const pctx = patch.getContext("2d");
        if (!pctx) throw new Error("Canvas unavailable.");
        pctx.putImageData(new ImageData(new Uint8ClampedArray(f.patch), f.dims.width, f.dims.height), 0, 0);
        fctx.drawImage(patch, f.dims.left, f.dims.top);
        if (i % skip === 0) {
          sctx.drawImage(full, 0, 0, width, h);
          const data = sctx.getImageData(0, 0, width, h).data;
          const palette = quantize(data, colors);
          const index = applyPalette(data, palette);
          const end = Math.min(i + skip, raw.length);
          const delay = raw.slice(i, end).reduce((s, x) => s + x.delay, 0);
          enc.writeFrame(index, width, h, { palette, delay: Math.max(1, delay) });
          kept++;
        }
        if (f.disposalType === 3 && snapshot) fctx.putImageData(snapshot, 0, 0);
        if (i % 10 === 0) {
          setProgress(Math.round((i / raw.length) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      enc.finish();
      const blob = new Blob([new Uint8Array(enc.bytes())], { type: "image/gif" });
      setOut({ url: URL.createObjectURL(blob), size: blob.size, frames: kept });
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that GIF.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out.url;
    a.download = `${name.replace(/\.[^.]+$/, "")}-optimized.gif`;
    a.click();
  };

  const saved = out ? origSize - out.size : 0;

  return (
    <ToolShell
      crumb="GIF-FORGE"
      title="The shaver."
      tagline="Shrink a GIF by dropping frames, cutting width and reducing the palette — re-encoded locally. compress.fast bills credits per 5 MB, image2url caps free uploads at 5 MB; palette math is free."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Settings
            <FileImage className="h-4 w-4" aria-hidden="true" />
          </h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? name : "Pick a GIF"}
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              {info
                ? `${info.frames} frames · ${info.width}×${info.height}`
                : "Decoded frame-by-frame, never uploaded"}
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/gif,.gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void optimize(f);
              e.target.value = "";
            }}
          />

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Width — {width} px
            </span>
            <input
              type="range"
              min={100}
              max={1000}
              step={20}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="mt-2 w-full accent-ink"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Palette — {colors} colors
            </span>
            <input
              type="range"
              min={16}
              max={256}
              step={16}
              value={colors}
              onChange={(e) => setColors(Number(e.target.value))}
              className="mt-2 w-full accent-ink"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Keep every {skip} frame{skip > 1 ? " (drops to ~" + Math.ceil((info?.frames ?? 0) / skip) + " frames)" : ""}
            </span>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={skip}
              onChange={(e) => setSkip(Number(e.target.value))}
              className="mt-2 w-full accent-ink"
            />
          </label>

          {busy && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">Re-encoding…</span>
                <span className="font-mono text-xs font-bold text-ink/60">{progress}%</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-sm border-2 border-ink bg-surface">
                <div
                  className="h-full bg-yellow transition-[width] duration-200 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Result</h2>

          {out ? (
            <>
              <img src={out.url} alt="Optimized GIF preview" className="mt-4 w-full rounded-md border-2 border-ink" />
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
                <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
                {fmtSize(origSize)} → {fmtSize(out.size)}
                {saved > 0 ? ` (−${Math.round((saved / origSize) * 100)}%)` : ""} · {out.frames} frames
              </p>
              <Button onClick={download} className="mt-3 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download optimized GIF
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The shaved GIF appears here with its before/after size
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Re-encoded with gifenc — frames, delays and transparency preserved, no upload at any step.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The credit-metered compressors charge per megabyte shaved; the shaving itself is a palette lookup.
      </p>
    </ToolShell>
  );
}