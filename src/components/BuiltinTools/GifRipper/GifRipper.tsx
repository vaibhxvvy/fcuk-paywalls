import { useRef, useState } from "react";
import { Download, Film, Upload } from "lucide-react";
import { parseGIF, decompressFrames, type ParsedGif } from "gifuct-js";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const MAX_EDGE = 1000;

function pngBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(",")[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pngDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function GifRipper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [frames, setFrames] = useState<{ url: string; delay: number }[]>([]);
  const [meta, setMeta] = useState<string>("");
  const [everyNth, setEveryNth] = useState(1);
  const [maxW, setMaxW] = useState(480);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = async (f: File) => {
    setBusy(true);
    setError(null);
    setDone(null);
    setFrames([]);
    setMeta("");
    try {
      const buf = await f.arrayBuffer();
      const gif: ParsedGif = parseGIF(new Uint8Array(buf).buffer);
      const all = decompressFrames(gif, true);
      if (all.length === 0) throw new Error("NO FRAMES FOUND");

      const scale = Math.min(1, MAX_EDGE / Math.max(gif.lsd.width, gif.lsd.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(gif.lsd.width * scale);
      canvas.height = Math.round(gif.lsd.height * scale);
      const ctx = canvas.getContext("2d")!;

      const out: { url: string; delay: number }[] = [];
      let snapshot: HTMLCanvasElement | null = null;
      for (let i = 0; i < all.length; i++) {
        const fr = all[i];
        if (i > 0) {
          const prev = all[i - 1];
          if (prev.disposalType === 2) {
            ctx.clearRect(prev.dims.left * scale, prev.dims.top * scale, prev.dims.width * scale, prev.dims.height * scale);
          } else if (prev.disposalType === 3 && snapshot) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(snapshot, 0, 0);
          }
        }
        snapshot = document.createElement("canvas");
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        snapshot.getContext("2d")!.drawImage(canvas, 0, 0);

        const img = ctx.createImageData(fr.dims.width, fr.dims.height);
        img.data.set(fr.patch);
        ctx.putImageData(img, Math.round(fr.dims.left * scale), Math.round(fr.dims.top * scale));
        if ((i + 1) % everyNth === 0 || i === all.length - 1) {
          out.push({ url: pngDataUrl(canvas), delay: fr.delay });
        }
      }

      setName(f.name);
      setMeta(`${all.length} frames · ${gif.lsd.width}×${gif.lsd.height} · ${(buf.byteLength / 1024).toFixed(0)} KB`);
      setFrames(out.slice(0, 12));
      setDone(`[ OK ] ${out.length} FRAMES RENDERED — PICKING ${everyNth === 1 ? "ALL" : "EVERY " + everyNth} OF THEM FOR THE ZIP`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decode the GIF.");
    } finally {
      setBusy(false);
    }
  };

  const rip = async () => {
    if (frames.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};
      const pad = String(frames.length).length;
      frames.forEach((fr, i) => {
        files[`${name.replace(/\.[^.]+$/, "") || "gif"}-frame-${String(i + 1).padStart(pad, "0")}.png`] = pngBytes(fr.url);
      });
      const zipped = zipSync(files);
      const blob = new Blob([zipped], { type: "application/zip" });
      const a = document.createElement("a");
      a.download = `${name.replace(/\.[^.]+$/, "") || "gif"}-frames.zip`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(`[ OK ] ${frames.length} FRAMES IN ONE ZIP — ${(blob.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rip failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      crumb="GIF-RIPPER"
      title="The frame thief."
      tagline="Split an animated GIF into its frames as PNGs — every frame, or every Nth, in one ZIP. The online GIF tools are free but they cap uploads at ~200 MB and delete your files an hour after upload; decoding GIF is a spec, not a service."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The GIF</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name || "Pick an animated GIF"}
            </p>
            {meta && <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">{meta}</p>}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}

          <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The sampling</h2>
          <label className="mt-3 block">
            <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Take every Nth frame <span className="text-ink">{everyNth}</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={everyNth}
              onChange={(e) => setEveryNth(Number(e.target.value))}
              className="mt-1.5 w-full accent-yellow"
            />
          </label>
          <label className="mt-3 block">
            <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Max width <span className="text-ink">{maxW}px</span>
            </span>
            <input
              type="range"
              min={120}
              max={1000}
              step={20}
              value={maxW}
              onChange={(e) => setMaxW(Number(e.target.value))}
              className="mt-1.5 w-full accent-yellow"
            />
          </label>
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The frames</h2>

          {frames.length > 0 ? (
            <div className="mt-4 grid flex-1 grid-cols-3 content-start gap-2 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-2">
              {frames.map((fr, i) => (
                <figure key={i} className="overflow-hidden rounded border-2 border-ink/40">
                  <img src={fr.url} alt={`Frame ${i + 1}`} className="block w-full" style={{ width: `${maxW}px`, maxWidth: "100%" }} />
                  <figcaption className="bg-ink px-1 py-0.5 text-center font-mono text-[9px] font-bold text-surface">
                    #{i + 1}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <div className="text-center">
                <Film className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
                <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                  The first 12 frames preview here — all of them land in the ZIP
                </p>
              </div>
            </div>
          )}

          <Button onClick={() => void rip()} disabled={busy || frames.length === 0} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy ? "Ripping…" : `Rip ${frames.length || ""} frame${frames.length === 1 ? "" : "s"} → ZIP`}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Frames are composed with correct disposal semantics — layered GIFs come out looking like
            the animation, not a stack of patches. No upload, no 1-hour deletion clock.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}