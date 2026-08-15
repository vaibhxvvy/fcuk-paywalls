import { useMemo, useRef, useState } from "react";
import { Download, Gauge, Upload, X } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/bmp"];
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

const RANGES = [
  { mime: "image/jpeg", max: 0.9, min: 0.05, step: 0.05, def: 0.7, label: "QUALITY" },
  { mime: "image/png", max: 9, min: 0, step: 1, def: 6, label: "COMPRESSION" },
  { mime: "image/webp", max: 100, min: 0, step: 1, def: 80, label: "QUALITY" },
];

export function ImageCrusher() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [level, setLevel] = useState<number>(0.7);
  const [mime, setMime] = useState("image/jpeg");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [sizes, setSizes] = useState<{ input: number; output: number; savedPct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const range = RANGES.find((r) => r.mime === mime) ?? RANGES[0];

  const pickFile = (f: File) => {
    setError(null);
    if (!ALLOWED.includes(f.type)) {
      setError(`UNSUPPORTED TYPE — ${f.type || "unknown"}. CRUSH JPG / PNG / WEBP / GIF / BMP / SVG.`);
      return;
    }
    setFile(f);
    setMime(f.type);
    setLevel(rangeFor(f.type).def);
    const objectUrl = URL.createObjectURL(f);
    setUrl(objectUrl);
    const img = new Image();
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = objectUrl;
  };

  const rangeFor = (m: string) => RANGES.find((r) => r.mime === m) ?? RANGES[0];

  const crusher = useMemo(() => {
    if (!url) return null;
    const run = async () => {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas ctx");
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mime, level);
      });
      if (!blob) throw new Error("no blob");
      return blob;
    };
    return { run };
  }, [url, mime, level]);

  const crush = async () => {
    setError(null);
    try {
      const blob = await crusher?.run();
      if (!blob) return;
      const outputUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = (file?.name ?? "image").replace(/\.[^.]+$/, "");
      a.download = `${base}.${MIME_EXT[mime] ?? "bin"}`;
      a.href = outputUrl;
      a.click();
      setSizes({
        input: file?.size ?? 0,
        output: blob.size,
        savedPct: file?.size ? Math.round((1 - blob.size / file.size) * 100) : 0,
      });
    } catch (e) {
      setError(`CRUSH FAILED — ${(e as Error).message}`);
    }
  };

  return (
    <ToolShell
      crumb="IMAGE-CRUSHER"
      title="The crusher."
      tagline="Smash image file size down to a fraction. Canvas-based re-encode with level control, right in the tab."
    >
      <div className="mt-10 rounded-lg border-[3px] border-dashed border-ink bg-surface p-5 text-center shadow-brutal-md">
        <Upload className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
        <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          Drop a JPG, PNG, WEBP, GIF, BMP or SVG here
        </p>
        <Button
          size="sm"
          className="mt-4 uppercase"
          onClick={() => inputRef.current?.click()}
        >
          Pick image
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {file && url && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [01] Victim
                <Gauge className="h-4 w-4" aria-hidden="true" />
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setUrl(null);
                  setSizes(null);
                  setDims(null);
                  setError(null);
                }}
                className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-red hover:text-ink"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center rounded-md border-2 border-ink bg-paper p-4">
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt="Image to compress"
                  className="max-h-64 max-w-full object-contain"
                />
              )}
            </div>
            <p className="mt-3 break-all font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              {file.name} · {dims ? `${dims.w}×${dims.h}px` : ""} · {(file.size / 1024).toFixed(1)} KB
            </p>
            <div className="mt-4">
              <div className="flex gap-2">
                {Object.entries(MIME_EXT).map(([m, ext]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMime(m);
                      setLevel(rangeFor(m).def);
                    }}
                    className={cn(
                      "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                      mime === m ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                    )}
                  >
                    {ext}
                  </button>
                ))}
              </div>
              <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                {range.label} — {level}
              </p>
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full accent-yellow"
              />
              {mime === "image/png" && (
                <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                  PNG compression is lossless — quality won&apos;t change, size might.
                </p>
              )}
            </div>
            <Button size="sm" className="mt-4 w-full uppercase" onClick={() => void crush()}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Crush &amp; download
            </Button>
            {sizes && (
              <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-[11px] font-bold uppercase tracking-widest">
                <p className="flex items-center gap-2 text-ink/60">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-red" />
                  Before {(sizes.input / 1024).toFixed(1)} KB
                </p>
                <p className="mt-1 flex items-center gap-2 text-ink/60">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
                  After {(sizes.output / 1024).toFixed(1)} KB —{" "}
                  <span className="text-green">-{sizes.savedPct}%</span>
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Canvas re-encode, 100% local — the pixels never leave your tab.
      </p>
    </ToolShell>
  );
}