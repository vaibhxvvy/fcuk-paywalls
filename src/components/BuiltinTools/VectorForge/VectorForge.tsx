import { useRef, useState } from "react";
import { Download, PenTool, Upload } from "lucide-react";
import ImageTracer from "imagetracerjs";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const MAX_EDGE = 1200;

export function VectorForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [colors, setColors] = useState(16);
  const [pathOmit, setPathOmit] = useState(8);
  const [blur, setBlur] = useState(0);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const previewUrl = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;

  const load = (f: File) => {
    setError(null);
    setDone(null);
    setSvg(null);
    const url = URL.createObjectURL(f);
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setName(f.name);
      URL.revokeObjectURL(url);
      void trace(el);
    };
    el.onerror = () => {
      setError("COULD NOT READ IMAGE");
      URL.revokeObjectURL(url);
    };
    el.src = url;
  };

  const trace = async (el: HTMLImageElement) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const max = Math.max(el.naturalWidth, el.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((el.naturalWidth * MAX_EDGE) / max);
      canvas.height = Math.round((el.naturalHeight * MAX_EDGE) / max);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      const svgStr = ImageTracer.imagedataToSVG(ctx.getImageData(0, 0, canvas.width, canvas.height), {
        numberofcolors: colors,
        pathomit: pathOmit,
        blurradius: blur,
        scale,
        ltres: 1,
        qtres: 1,
        roundcoords: 1,
        rightangleenhance: true,
        viewbox: false,
      });
      setSvg(svgStr);
      setDone(`[ OK ] TRACED TO ${svgStr.length.toLocaleString()} BYTES OF SVG — ${(svgStr.length / 1024).toFixed(1)} KB`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trace failed.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!svg) return;
    const a = document.createElement("a");
    a.download = `${name.replace(/\.[^.]+$/, "") || "vector"}.svg`;
    a.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    a.click();
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
      crumb="VECTOR-FORGE"
      title="The tracer."
      tagline="Turn any PNG or JPEG into a clean SVG — right in the tab, no credits. Vectorizer.AI charges $9.99/mo or 20 cents an image for this; tracing a bitmap is quantization plus edge-path fitting."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The bitmap</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {img ? name : "Pick PNG or JPEG"}
            </p>
            {img && (
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {img.naturalWidth}×{img.naturalHeight}px — traced at ≤{MAX_EDGE}px edge
              </p>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
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

          <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The trace</h2>
          {slider("Colors in palette", colors, 2, 32, 1, (v) => { setColors(v); if (img) void trace(img); })}
          {slider("Path omit (small-path cleanup)", pathOmit, 0, 32, 1, (v) => { setPathOmit(v); if (img) void trace(img); })}
          {slider("Pre-blur radius", blur, 0, 5, 1, (v) => { setBlur(v); if (img) void trace(img); })}
          {slider("Scale", scale, 1, 4, 1, (v) => { setScale(v); if (img) void trace(img); })}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The vector</h2>

          {previewUrl ? (
            <div className="mt-4 flex-1 overflow-auto rounded-md border-2 border-ink bg-white p-2">
              <img src={previewUrl} alt="Traced SVG preview" className="mx-auto block max-h-[420px] max-w-full" />
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <div className="text-center">
                <PenTool className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
                <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                  The SVG lands here — infinitely scalable, editable in any vector tool
                </p>
              </div>
            </div>
          )}

          <Button onClick={download} disabled={!svg} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download .SVG
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Re-trace is instant and free — every slider re-runs the fit locally. Vectorizer.AI's
            watermarked preview alone costs 0.2 credits.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}