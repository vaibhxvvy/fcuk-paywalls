import { useRef, useState } from "react";
import { Crop, FileDown, RotateCcw, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function WatermarkCropper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const draw = (withGuide = true) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !img || !ctx) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    if (withGuide && crop) {
      ctx.strokeStyle = "#ffd84d";
      ctx.lineWidth = Math.max(2, w / 200);
      ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
      ctx.fillStyle = "rgba(17,17,17,0.45)";
      ctx.fillRect(0, 0, w, crop.y);
      ctx.fillRect(0, crop.y + crop.h, w, h - crop.y - crop.h);
      ctx.fillRect(0, crop.y, crop.x, crop.h);
      ctx.fillRect(crop.x + crop.w, crop.y, w - crop.x - crop.w, crop.h);
    }
  };

  const onFile = (f: File) => {
    setName(f.name);
    setError(null);
    setPreview(null);
    setCrop(null);
    setZoom(1);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
      setStatus("idle");
    };
    img.onerror = () => {
      setError("Could not decode that image.");
      setStatus("error");
    };
    img.src = url;
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const img = imgRef.current;
    if (!img) return;
    const box = { x: p.x, y: p.y, w: 0, h: 0 };
    setCrop(box);
    e.currentTarget.setPointerCapture(e.pointerId);
    const drag = (ev: PointerEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const cx = ((ev.clientX - rect.left) * canvasRef.current!.width) / rect.width;
      const cy = ((ev.clientY - rect.top) * canvasRef.current!.height) / rect.height;
      const nb = {
        x: Math.max(0, Math.min(p.x, cx)),
        y: Math.max(0, Math.min(p.y, cy)),
        w: Math.min(img.naturalWidth - Math.min(p.x, cx), Math.abs(cx - p.x)),
        h: Math.min(img.naturalHeight - Math.min(p.y, cy), Math.abs(cy - p.y)),
      };
      setCrop(nb);
    };
    const up = () => {
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", up);
  };

  const onExport = () => {
    const img = imgRef.current;
    if (!img || !crop || crop.w < 2 || crop.h < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(crop.w);
    canvas.height = Math.floor(crop.h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setPreview(dataUrl);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${name.replace(/\.[^.]+$/, "")}-cropped.png`;
    a.click();
    setStatus("done");
  };

  const reset = () => {
    setCrop(null);
    setPreview(null);
    setZoom(1);
    setStatus("idle");
    draw();
  };

  return (
    <ToolShell
      crumb="WATERMARK-CROPPER"
      title="The trim."
      tagline="The honest watermark remover: crop the corner off and re-save. The 'AI watermark removal' sites charge you for fake magic — cropping is the real free fix."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Upload className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? "Pick another image" : "Drop or pick an image"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Drag a box around the clean area — anything outside it gets cut
            </p>
          </button>

          <p className="mt-5 rounded-md border-2 border-ink bg-yellow/30 px-3 py-3 font-mono text-[10px] font-bold uppercase leading-relaxed tracking-widest text-ink">
            The honest part: if the watermark sits in the middle of the image, cropping can't save you — and
            neither can any 'AI remover', legally or technically. Cut the corner, keep the image.
          </p>

          {status === "error" && (
            <p className="mt-5 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Crop
              <Crop className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100))}
                disabled={zoom <= 1}
                className="rounded-md border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <span className="w-12 text-center font-mono text-[10px] font-bold text-ink/60">{zoom}×</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                disabled={zoom >= 4}
                className="rounded-md border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
              <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden="true" />
              <button
                type="button"
                onClick={reset}
                className="rounded-md border-2 border-ink p-1.5 text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                title="Reset crop"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
            <div className="overflow-hidden" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: "100%" }}>
              <canvas
                ref={canvasRef}
                onPointerDown={onPointerDown}
                className="block max-w-full touch-none select-none"
                style={{ cursor: "crosshair", width: "100%", height: "auto" }}
              />
            </div>
          </div>

          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            {crop && crop.w >= 2 && crop.h >= 2
              ? `Selection ${Math.floor(crop.w)}×${Math.floor(crop.h)}px`
              : "Drag to draw the crop box"}
          </p>

          {preview && (
            <div className="mt-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Result</p>
              <img src={preview} alt="Cropped result" className="mt-1 max-h-40 rounded-md border-2 border-ink bg-surface-muted object-contain" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={onExport}
              disabled={!crop || crop.w < 2 || crop.h < 2 || !imgRef.current}
              className="uppercase"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Download cropped PNG
            </Button>
            {status === "done" && (
              <span className="rounded-md border-2 border-ink bg-green/20 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                Saved — watermark gone with the crop
              </span>
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Cropped locally on canvas — the watermark remover that never asks for credits.
      </p>
    </ToolShell>
  );
}