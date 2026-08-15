import { useMemo, useRef, useState } from "react";
import { Crop } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const MIME_TO_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function ImageResizer() {
  const [img, setImg] = useState<{ url: string; w: number; h: number } | null>(null);
  const [mode, setMode] = useState<"width" | "percent">("width");
  const [target, setTarget] = useState("800");
  const [percent, setPercent] = useState("50");
  const [keepRatio, setKeepRatio] = useState(true);
  const [format, setFormat] = useState<"png" | "jpeg" | "webp">("png");
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dims = useMemo(() => {
    if (!img) return null;
    const n = mode === "width" ? Number(target) : (Number(percent) / 100) * img.w;
    const w = Math.max(1, Math.round(n));
    const h = keepRatio ? Math.max(1, Math.round((img.h / img.w) * w)) : Math.max(1, Math.round(Number(percent) / 100 * img.h));
    return { w, h };
  }, [img, mode, target, percent, keepRatio]);

  const pick = (file: File) => {
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      setImg({ url, w: probe.naturalWidth, h: probe.naturalHeight });
      setTarget(String(probe.naturalWidth));
    };
    probe.src = url;
  };

  const download = () => {
    if (!img || !dims) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const src = new Image();
    src.onload = () => {
      ctx.drawImage(src, 0, 0, dims.w, dims.h);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const a = document.createElement("a");
            a.download = `fcuk-resized-${dims.w}x${dims.h}.${MIME_TO_EXT[`image/${format}`]}`;
            a.href = URL.createObjectURL(blob);
            a.click();
          }
          setBusy(false);
        },
        `image/${format}`,
        format === "png" ? undefined : quality,
      );
    };
    src.src = img.url;
  };

  return (
    <ToolShell
      crumb="IMAGE-RESIZER"
      title="The fitter."
      tagline="Resize images to exact pixels or a percentage — no upload, no compression surprises."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Crop className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pick(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "mt-4 w-full rounded-lg border-[3px] border-ink bg-surface-muted px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30",
            )}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              {img ? "Pick a different image" : "Drop or pick an image"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              PNG · JPG · WEBP · GIF · BMP — stays in your tab
            </p>
          </button>

          {img && (
            <div className="mt-4 rounded-md border-2 border-ink bg-ink p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/60">Original</p>
              <p className="font-mono text-sm font-bold text-paper">
                {img.w} × {img.h}px
              </p>
              <img
                src={img.url}
                alt="Source preview"
                className="mt-2 max-h-56 w-full rounded-md border-2 border-paper/20 object-contain"
              />
            </div>
          )}
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Settings</h2>

          <div className="mt-4 flex gap-2">
            {(
              [
                ["width", "Target width"],
                ["percent", "Percentage"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color] duration-200 ease-brutal",
                  mode === m ? "bg-ink text-surface" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "width" ? (
            <label className="mt-4 block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Width (px)</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-sm font-bold text-ink outline-none focus:border-yellow"
              />
            </label>
          ) : (
            <label className="mt-4 block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Percentage (%)</span>
              <input
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-sm font-bold text-ink outline-none focus:border-yellow"
              />
            </label>
          )}

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
            <input
              type="checkbox"
              checked={keepRatio}
              onChange={(e) => setKeepRatio(e.target.checked)}
              className="h-4 w-4 accent-yellow"
            />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
              Keep aspect ratio
            </span>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Format</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="mt-1 w-full cursor-pointer rounded-md border-2 border-ink bg-surface px-2 py-2 font-mono text-sm font-semibold text-ink outline-none focus:border-yellow"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPG</option>
                <option value="webp">WEBP</option>
              </select>
            </label>
            {format !== "png" && (
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Quality {Math.round(quality * 100)}%
                </span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="mt-3 w-full accent-yellow"
                />
              </label>
            )}
          </div>

          {img && dims && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Result</p>
              <p className="font-mono text-sm font-bold text-ink">
                {dims.w} × {dims.h}px
              </p>
              <div className="mt-2 grid place-items-center rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] p-3">
                <img
                  src={img.url}
                  alt="Result preview"
                  className="border-2 border-ink object-contain"
                  style={{ width: dims.w, height: dims.h, maxWidth: "100%", maxHeight: "24rem" }}
                />
              </div>
            </div>
          )}

          <Button
            onClick={download}
            disabled={!img || !dims || busy}
            size="md"
            className="mt-5 w-full uppercase"
          >
            {busy ? "Rendering…" : `Download ${dims ? `${dims.w}×${dims.h}` : ""}`}
          </Button>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Rendered on a canvas in your tab — the file never leaves.
      </p>
    </ToolShell>
  );
}