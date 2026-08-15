import { useRef, useState } from "react";
import { ZoomIn, Download } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

interface ImgState {
  url: string;
  el: HTMLImageElement;
  w: number;
  h: number;
}

function boxBlur(data: Float32Array, w: number, h: number, radius: number): Float32Array {
  const out = new Float32Array(data.length);
  const tmp = new Float32Array(data.length);
  const r = Math.max(1, radius);
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let x = -r; x <= r; x++) {
        const px = Math.min(w - 1, Math.max(0, x));
        acc += data[(y * w + px) * 3 + c];
      }
      for (let x = 0; x < w; x++) {
        tmp[(y * w + x) * 3 + c] = acc / (r * 2 + 1);
        const addPx = Math.min(w - 1, x + r + 1);
        const subPx = Math.max(0, x - r);
        acc += data[(y * w + addPx) * 3 + c] - data[(y * w + subPx) * 3 + c];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) {
        const py = Math.min(h - 1, Math.max(0, y));
        acc += tmp[(py * w + x) * 3 + c];
      }
      for (let y = 0; y < h; y++) {
        out[(y * w + x) * 3 + c] = acc / (r * 2 + 1);
        const addY = Math.min(h - 1, y + r + 1);
        const subY = Math.max(0, y - r);
        acc += tmp[(addY * w + x) * 3 + c] - tmp[(subY * w + x) * 3 + c];
      }
    }
  }
  return out;
}

function unsharp(data: Float32Array, w: number, h: number, amount: number, radius: number): Float32Array {
  const blur = boxBlur(data, w, h, radius);
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = Math.max(0, Math.min(255, data[i] + amount * (data[i] - blur[i])));
  }
  return out;
}

function upscaleImage(
  el: HTMLImageElement,
  srcW: number,
  srcH: number,
  scale: number,
  sharpen: number,
): string {
  const steps = Math.max(1, Math.ceil(Math.log(scale) / Math.log(1.6)));
  const stepScale = Math.pow(scale, 1 / steps);

  let canvas = document.createElement("canvas");
  canvas.width = srcW;
  canvas.height = srcH;
  let ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(el, 0, 0);

  for (let s = 0; s < steps; s++) {
    const nextW = Math.max(1, Math.round(canvas.width * stepScale));
    const nextH = Math.max(1, Math.round(canvas.height * stepScale));
    if (nextW === canvas.width && nextH === canvas.height) break;
    const next = document.createElement("canvas");
    next.width = nextW;
    next.height = nextH;
    const nctx = next.getContext("2d")!;
    nctx.imageSmoothingEnabled = true;
    nctx.imageSmoothingQuality = "high";
    nctx.drawImage(canvas, 0, 0, nextW, nextH);
    canvas = next;
    ctx = nctx;
  }

  if (sharpen > 0) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const f = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) f[i] = data[i];
    const sharpened = unsharp(f, canvas.width, canvas.height, sharpen, 2);
    for (let i = 0; i < data.length; i++) data[i] = sharpened[i];
    ctx.putImageData(imgData, 0, 0);
  }

  return canvas.toDataURL("image/png");
}

export function ImageUpscaler() {
  const [img, setImg] = useState<ImgState | null>(null);
  const [factor, setFactor] = useState(4);
  const [sharpen, setSharpen] = useState(0.6);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outUrlRef = useRef<string | null>(null);
  const [outDims, setOutDims] = useState<{ w: number; h: number } | null>(null);

  const pick = (file: File) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg({ url, el, w: el.naturalWidth, h: el.naturalHeight });
      run(el, el.naturalWidth, el.naturalHeight, factor, sharpen);
    };
    el.src = url;
  };

  const run = (
    el: HTMLImageElement,
    w: number,
    h: number,
    f: number,
    sh: number,
  ) => {
    const MAX_MP = 16;
    if (w * h * f * f > MAX_MP * 1_000_000) {
      f = Math.sqrt((MAX_MP * 1_000_000) / (w * h));
    }
    const result = upscaleImage(el, w, h, f, sh);
    if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    outUrlRef.current = result;
    setOutDims({ w: Math.round(w * f), h: Math.round(h * f) });
  };

  const reprocess = () => {
    if (!img || busy) return;
    setBusy(true);
    requestAnimationFrame(() => {
      run(img.el, img.w, img.h, factor, sharpen);
      setBusy(false);
    });
  };

  const download = () => {
    if (!outUrlRef.current) return;
    const a = document.createElement("a");
    a.href = outUrlRef.current;
    a.download = "fcuk-upscaled.png";
    a.click();
  };

  return (
    <ToolShell
      crumb="IMAGE-UPSCALER"
      title="The enlarger."
      tagline="Upscale images with lanczos steps and unsharp sharpening — unlimited, no credits, no expiring tokens."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
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
              {img ? `${img.w} × ${img.h}px` : "PNG · JPG · WEBP — stays in your tab"}
            </p>
          </button>

          {img && (
            <div className="mt-4 rounded-md border-2 border-ink bg-ink p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/60">Original</p>
              <img src={img.url} alt="Source" className="mt-2 max-h-40 w-full rounded-md border-2 border-paper/20 object-contain" />
            </div>
          )}

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Factor — {factor}×
              </span>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={factor}
                onChange={(e) => setFactor(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Sharpening — {sharpen.toFixed(1)}
              </span>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.1}
                value={sharpen}
                onChange={(e) => setSharpen(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <Button onClick={reprocess} disabled={!img || busy} size="sm" className="uppercase">
              {busy ? "Working…" : "Reprocess"}
            </Button>
            <p className="rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
              This is real interpolation — step-scaling + unsharp mask. It can't
              invent detail the way AI upscalers do, but it also can't burn a
              credit on a bad result. Output capped at ~16 megapixels.
            </p>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Result</h2>
          {outUrlRef.current ? (
            <>
              <div className="mt-4 grid flex-1 place-items-center rounded-md border-2 border-ink bg-surface-muted p-4">
                <img
                  src={outUrlRef.current}
                  alt="Upscaled preview"
                  className="max-h-[26rem] w-auto border-2 border-ink object-contain"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  {outDims ? `${outDims.w} × ${outDims.h}px · PNG` : ""}
                </p>
                <Button onClick={download} size="sm" className="uppercase">
                  <Download className="h-4 w-4" aria-hidden="true" /> PNG
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Enlargement appears here
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Free, unlimited, no account — the Magnific subscription you never needed.
      </p>
    </ToolShell>
  );
}