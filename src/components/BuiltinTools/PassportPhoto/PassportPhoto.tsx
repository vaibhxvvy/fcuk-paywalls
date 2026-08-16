import { useRef, useState } from "react";
import { FileDown, IdCard, Printer, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RATIOS: { id: string; name: string; rw: number; rh: number }[] = [
  { id: "35x45", name: "35×45mm (ISO)", rw: 35, rh: 45 },
  { id: "51x51", name: "51×51mm", rw: 1, rh: 1 },
  { id: "2x2", name: "2×2in (US)", rw: 1, rh: 1 },
  { id: "33x48", name: "33×48mm", rw: 33, rh: 48 },
];

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

export function PassportPhoto() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [tolerance, setTolerance] = useState(28);
  const [crop, setCrop] = useState<CropBox | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);

  const moveRef = useRef<{ mode: "move" | "draw"; ox: number; oy: number; startX: number; startY: number } | null>(null);

  const draw = (c: CropBox | null) => {
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
    if (c) {
      ctx.fillStyle = "rgba(17,17,17,0.5)";
      ctx.fillRect(0, 0, w, c.y);
      ctx.fillRect(0, c.y + c.h, w, h - c.y - c.h);
      ctx.fillRect(0, c.y, c.x, c.h);
      ctx.fillRect(c.x + c.w, c.y, w - c.x - c.w, c.h);
      ctx.strokeStyle = "#ffd84d";
      ctx.lineWidth = Math.max(2, w / 200);
      ctx.strokeRect(c.x, c.y, c.w, c.h);
    }
  };

  const onFile = (f: File) => {
    setName(f.name);
    setError(null);
    setResult(null);
    setSheet(null);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw(null);
    };
    img.onerror = () => setError("Could not decode that image.");
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
    const img = imgRef.current;
    if (!img) return;
    const p = pos(e);
    const c = crop;
    if (c && p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) {
      moveRef.current = { mode: "move", ox: p.x - c.x, oy: p.y - c.y, startX: 0, startY: 0 };
    } else {
      moveRef.current = { mode: "draw", ox: 0, oy: 0, startX: p.x, startY: p.y };
      setCrop({ x: p.x, y: p.y, w: 0, h: 0 });
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const m = moveRef.current;
    const img = imgRef.current;
    if (!m || !img) return;
    const p = pos(e);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const ratioW = ratio.rw / ratio.rh;
    if (m.mode === "move") {
      const nb: CropBox = {
        x: Math.max(0, Math.min(w - crop!.w, p.x - m.ox)),
        y: Math.max(0, Math.min(h - crop!.h, p.y - m.oy)),
        w: crop!.w,
        h: crop!.h,
      };
      setCrop(nb);
    } else {
      const dx = p.x - m.startX;
      const dy = p.y - m.startY;
      const want = Math.max(Math.abs(dx), Math.abs(dy) * ratioW);
      const cw = Math.min(want, w - m.startX, (h - m.startY) * ratioW);
      const ch = cw / ratioW;
      setCrop({ x: m.startX, y: m.startY, w: cw, h: ch });
    }
  };

  const onPointerUp = () => {
    moveRef.current = null;
  };

  const removeBg = (img: HTMLImageElement, tol: number): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = id.data;
    const w = id.width;
    const h = id.height;
    const ref = [d[0], d[1], d[2]];
    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let x = 0; x < w; x++) {
      stack.push(x, (h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      stack.push(y * w, y * w + w - 1);
    }
    while (stack.length > 0) {
      const i = stack.pop()!;
      if (visited[i]) continue;
      const dr = d[i * 4] - ref[0];
      const dg = d[i * 4 + 1] - ref[1];
      const db = d[i * 4 + 2] - ref[2];
      if (Math.sqrt(dr * dr + dg * dg + db * db) > tol) continue;
      visited[i] = 1;
      const x = i % w;
      const y = Math.floor(i / w);
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - w);
      if (y < h - 1) stack.push(i + w);
    }
    for (let i = 0; i < visited.length; i++) {
      if (visited[i]) {
        d[i * 4] = 255;
        d[i * 4 + 1] = 255;
        d[i * 4 + 2] = 255;
        d[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
    return canvas;
  };

  const buildResult = () => {
    const img = imgRef.current;
    if (!img || !crop || crop.w < 4 || crop.h < 4) {
      setError("Drag a crop box around your face first.");
      return null;
    }
    const clean = removeBg(img, tolerance);
    const canvas = document.createElement("canvas");
    const pxW = Math.round(ratio.rw * 11.8);
    const pxH = Math.round(ratio.rh * 11.8);
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, pxW, pxH);
    ctx.drawImage(clean, crop.x, crop.y, crop.w, crop.h, 0, 0, pxW, pxH);
    const dataUrl = canvas.toDataURL("image/png");
    setResult(dataUrl);
    return dataUrl;
  };

  const sheetCanvas = (photo: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 794;
      canvas.height = 1123;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 794, 1123);
      const margin = 45;
      const cellW = (794 - margin * 2) / 2;
      const cellH = (1123 - margin * 2) / 3;
      const imgAspect = img.width / img.height;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          let w = cellW;
          let h = cellH;
          if (imgAspect > 1) h = cellW / imgAspect;
          else w = cellH * imgAspect;
          ctx.drawImage(
            img,
            margin + c * cellW + (cellW - w) / 2,
            margin + r * cellH + (cellH - h) / 2,
            w,
            h,
          );
        }
      }
      setSheet(canvas.toDataURL("image/png"));
    };
    img.src = photo;
  };

  const download = (dataUrl: string, fname: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fname;
    a.click();
  };

  return (
    <ToolShell
      crumb="PASSPORT-PHOTO"
      title="The headshot."
      tagline="Crop to a real passport ratio, scrub the background to white, print a 6-up A4 sheet. The passport-photo apps charge per print; the crop is the only math involved."
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
              {name ? "Pick another photo" : "Drop or pick a photo"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Drag a ratio-locked box around your face
            </p>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Ratio</span>
              <select
                className={inputCls}
                value={ratio.id}
                onChange={(e) => setRatio(RATIOS.find((r) => r.id === e.target.value) ?? RATIOS[0])}
              >
                {RATIOS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Background tolerance {tolerance}
              </span>
              <input
                type="range"
                min={0}
                max={80}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="mt-2 w-full accent-ink"
              />
            </label>
          </div>
          <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            Tolerance scrubs the background around your head to pure white — edges flood-filled from the borders.
          </p>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Photo
            <IdCard className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 flex-1 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="block max-w-full touch-none select-none"
              style={{ cursor: "crosshair", width: "100%", height: "auto" }}
            />
          </div>

          {result && (
            <div className="mt-4 flex items-center gap-4 rounded-md border-2 border-ink bg-surface-muted p-3">
              <img src={result} alt="Cropped passport photo" className="h-32 w-auto rounded-sm border-2 border-ink" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Button onClick={() => download(result, `${name.replace(/\.[^.]+$/, "")}-passport-${ratio.id}.png`)} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Photo PNG
                </Button>
                <Button variant="secondary" onClick={() => sheetCanvas(result)} className="uppercase">
                  Build 6-up sheet
                </Button>
                {sheet && (
                  <>
                    <Button variant="ink" onClick={() => download(sheet, `${name.replace(/\.[^.]+$/, "")}-passport-sheet-a4.png`)} className="uppercase">
                      <FileDown className="h-4 w-4" aria-hidden="true" />
                      Sheet PNG
                    </Button>
                    <Button variant="secondary" onClick={() => window.print()} className="uppercase">
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Print sheet
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {!result && (
            <Button onClick={() => buildResult()} disabled={!imgRef.current} className="mt-4 w-full uppercase">
              <IdCard className="h-4 w-4" aria-hidden="true" />
              Crop + whiten
            </Button>
          )}
        </section>
      </div>

      {result && (
        <div className="photo-print-root">
          <div className="photo-print-page">
            <div className="grid grid-cols-2 grid-rows-3 gap-[10mm] p-[12mm]">
              {Array.from({ length: 6 }, (_, i) => (
                <img key={i} src={result} alt="" className="h-[88mm] w-full object-contain" />
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Cropped and scrubbed locally on canvas — the passport studio that never charges per print.
      </p>
    </ToolShell>
  );
}