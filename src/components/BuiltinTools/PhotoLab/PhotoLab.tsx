import { useEffect, useRef, useState } from "react";
import { Download, ImageIcon, RotateCcw } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

export function PhotoLab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sepia, setSepia] = useState(0);
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  const [out, setOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (iw === 0 || ih === 0) return;
    const maxW = 1600;
    const scale = Math.min(1, maxW / iw);
    const w = Math.round(iw * scale);
    const h = Math.round(ih * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) sepia(${sepia}%)`;
    ctx.drawImage(img, 0, 0, w, h);
    if (vignette > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${vignette / 100})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (grain > 0) {
      const noise = ctx.createImageData(w, h);
      const d = noise.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() - 0.5) * 2.55;
        d[i] = d[i + 1] = d[i + 2] = 128 + v;
        d[i + 3] = 255;
      }
      const nc = document.createElement("canvas");
      nc.width = w;
      nc.height = h;
      nc.getContext("2d")?.putImageData(noise, 0, 0);
      ctx.globalAlpha = (grain / 100) * 0.5;
      ctx.drawImage(nc, 0, 0);
      ctx.globalAlpha = 1;
    }
    setOut(canvas.toDataURL(format));
  }, [img, brightness, contrast, saturation, sepia, vignette, grain, format]);

  const onFile = (f: File) => {
    setError(null);
    const u = URL.createObjectURL(f);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setName(f.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(u);
      setError("That file isn't a readable image.");
    };
    image.src = u;
  };

  const reset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
    setVignette(0);
    setGrain(0);
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out;
    a.download = `${(name || "photo").replace(/\.[^.]+$/, "")}-edited${format === "image/jpeg" ? ".jpg" : format === "image/webp" ? ".webp" : ".png"}`;
    a.click();
  };

  const slider = (
    label: string,
    value: number,
    set: (v: number) => void,
    min: number,
    max: number,
    display = `${Math.round(value)}`,
  ) => (
    <label className="block">
      <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
        {label}
        <span className="text-ink/80">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-2 w-full accent-ink"
      />
    </label>
  );

  return (
    <ToolShell
      crumb="PHOTO-LAB"
      title="The darkroom."
      tagline="Brightness, contrast, saturation, sepia, vignette, grain — live on a canvas in this tab. The subscription editors meter exports and bill monthly; filters are matrix math."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Chemistry
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
          </h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? name : "Pick a photo"}
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              JPG · PNG · WebP — processed on the canvas
            </p>
          </button>
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

          {img && (
            <>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {slider("Brightness", brightness, setBrightness, 20, 200)}
                {slider("Contrast", contrast, setContrast, 20, 200)}
                {slider("Saturation", saturation, setSaturation, 0, 200)}
                {slider("Sepia", sepia, setSepia, 0, 100, sepia ? `${sepia}%` : "off")}
                {slider("Vignette", vignette, setVignette, 0, 100, vignette ? `${vignette}%` : "off")}
                {slider("Grain", grain, setGrain, 0, 100, grain ? `${grain}%` : "off")}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Format</span>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as typeof format)}
                    className="mt-1 rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
                  >
                    <option value="image/png">PNG</option>
                    <option value="image/jpeg">JPG</option>
                    <option value="image/webp">WebP</option>
                  </select>
                </label>
                <Button variant="secondary" size="sm" onClick={reset} className="ml-auto uppercase">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reset
                </Button>
              </div>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Print</h2>
          {img ? (
            <>
              <img src={out ?? undefined} alt="Edited preview" className="mt-4 max-h-96 w-full rounded-md border-2 border-ink object-contain" />
              <Button onClick={download} disabled={!out} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Export edited photo
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The darkroom appears once a photo is loaded
              </p>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Every slider re-renders the canvas live — no export credits, no watermark at any size.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The subscription darkrooms sell you presets; the math behind every preset is six sliders.
      </p>
    </ToolShell>
  );
}