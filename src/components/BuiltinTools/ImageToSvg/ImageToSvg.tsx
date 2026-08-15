import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, FileUp, PenTool, RotateCcw, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { buttonVariants } from "../../ui/button";
import { BrickWall } from "../../decoration/BrickWall";
import { cn } from "../../../utils/cn";
import ImageTracer from "imagetracerjs";
import { DEFAULT_SVG } from "../SvgViewer/SvgViewer";

const INPUT_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.bmp,.svg";
const MAX_TRACE_DIM = 900;

interface Source {
  name: string;
  baseName: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
}

interface TraceResult {
  svg: string;
  url: string;
  bytes: number;
  paths: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = url;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function detectFormat(name: string): string {
  return (name.split(".").pop() ?? "unknown").toUpperCase();
}

export function ImageToSvg() {
  const [source, setSource] = useState<Source | null>(null);
  const [colors, setColors] = useState(8);
  const [blur, setBlur] = useState(3);
  const [dragOver, setDragOver] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const traceIdRef = useRef(0);

  const processUrl = useCallback(async (url: string, name: string, format: string) => {
    setError(null);
    setResult(null);
    try {
      const img = await loadImage(url);
      setSource({
        name,
        baseName: name.replace(/\.[^.]+$/, ""),
        url,
        bytes: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format,
      });
    } catch {
      setError("THE WALL WON. COULDN'T DECODE THAT FILE — TRY ANOTHER ONE.");
    }
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
        const text = await file.text();
        await processUrl(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
          file.name,
          "SVG",
        );
      } else {
        await processUrl(URL.createObjectURL(file), file.name, detectFormat(file.name));
      }
    },
    [processUrl],
  );

  const loadSample = useCallback(async () => {
    await processUrl(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_SVG)}`,
      "sample.png",
      "PNG",
    );
  }, [processUrl]);

  const trace = useCallback(async () => {
    if (!source) return;
    const id = ++traceIdRef.current;
    setTracing(true);
    setError(null);
    try {
      const img = await loadImage(source.url);

      const scale = Math.min(1, MAX_TRACE_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);

      await new Promise((resolve) => setTimeout(resolve, 50));
      const svg = ImageTracer.imagedataToSVG(data, {
        numberOfColors: colors,
        blurRadius: blur,
      });
      if (id !== traceIdRef.current) return;

      setResult({
        svg,
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        bytes: new Blob([svg]).size,
        paths: (svg.match(/<path /g) || []).length,
      });
    } catch {
      if (id === traceIdRef.current) {
        setError("THE WALL WON. TRACING FAILED — TRY A SIMPLER, FLATTER IMAGE.");
      }
    } finally {
      if (id === traceIdRef.current) setTracing(false);
    }
  }, [source, colors, blur]);

  useEffect(() => {
    if (source) void trace();
  }, [source, colors, blur, trace]);

  const download = () => {
    if (!result || !source) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${source.baseName}-traced.svg`;
    a.click();
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    traceIdRef.current++;
    setSource(null);
    setResult(null);
    setError(null);
    setColors(8);
    setBlur(3);
    setTracing(false);
  };

  return (
    <main className="py-12" id="main-content">
      <div className="page-container">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          INDEX / TOOLS / IMAGE-TO-SVG
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.95] tracking-tight">
          The tracer.
        </h1>
        <p className="mt-4 max-w-md text-lg font-medium text-ink/80">
          Vectorize any image into a clean SVG. Tuned for logos, icons and
          flat art — a photo in, a blocky mess out. All in your browser.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [01] Source
              </h2>
              {source && <Badge variant="blue">{source.format}</Badge>}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={INPUT_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadFile(file);
                e.target.value = "";
              }}
            />

            {!source ? (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void loadFile(file);
                  }}
                  className={cn(
                    "mt-4 flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-[3px] border-dashed border-ink/60 bg-surface-muted p-6 text-center transition-[transform,border-color,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:border-ink hover:bg-yellow/20 active:translate-y-0",
                    dragOver && "-translate-y-0.5 border-ink bg-yellow/20",
                  )}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-md border-2 border-ink bg-yellow shadow-brutal-sm">
                    <PenTool className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p className="font-display text-xl font-bold uppercase tracking-tight">
                    Drop an image or click to browse
                  </p>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                    PNG · JPG · WEBP · GIF · BMP · SVG
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadSample()}
                  className="mt-4 inline-flex items-center gap-2 self-center font-mono text-[11px] font-bold uppercase tracking-widest text-ink/70 underline decoration-ink/40 decoration-2 underline-offset-4 transition-colors hover:text-ink"
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  Or load the sample
                </button>
              </>
            ) : (
              <>
                <div className="mt-4 flex min-h-[220px] items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] p-4">
                  <img
                    src={source.url}
                    alt={source.name}
                    className="max-h-56 max-w-full object-contain"
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70">
                  <dt>File</dt>
                  <dd className="truncate text-right">{source.name}</dd>
                  <dt>Dims</dt>
                  <dd className="text-right">
                    {source.width} × {source.height}
                  </dd>
                  <dt>Trace size</dt>
                  <dd className="text-right">
                    {Math.min(MAX_TRACE_DIM, source.width)} ×{" "}
                    {Math.min(MAX_TRACE_DIM, source.height)} max
                  </dd>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "inline-flex items-center gap-2",
                    )}
                  >
                    <FileUp className="h-4 w-4" aria-hidden="true" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => void loadSample()}
                    className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/70 underline decoration-ink/40 decoration-2 underline-offset-4 transition-colors hover:text-ink"
                  >
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                    Sample
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Tracer
            </h2>

            <div className="mt-4">
              <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                <span>Colors</span>
                <span>{colors}</span>
              </p>
              <input
                type="range"
                min={2}
                max={16}
                step={1}
                value={colors}
                onChange={(e) => setColors(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
              <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                Fewer = flatter, bolder shapes. More = finer detail.
              </p>
            </div>

            <div className="mt-5">
              <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                <span>Blur</span>
                <span>{blur}</span>
              </p>
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={blur}
                onChange={(e) => setBlur(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
              <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                Smooths out noise before tracing. Photos want more, logos want less.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-md border-2 border-ink bg-surface-muted p-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Vector preview
              </p>
              <div className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px]">
                {tracing ? (
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                    Tracing…
                  </p>
                ) : result ? (
                  <img
                    src={result.url}
                    alt="Traced SVG preview"
                    className="max-h-44 max-w-full object-contain"
                  />
                ) : (
                  <PenTool className="h-10 w-10 text-ink/30" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copy}
                  disabled={!result}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copied ? "Copied" : "Copy SVG"}
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!result}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                    "inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download .svg
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="error" className="mt-4">
                <AlertTitle>Wall blocked it</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-5 flex items-center gap-3">
              <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                    tracing ? "animate-pulse bg-yellow" : "bg-green",
                  )}
                />
                {tracing
                  ? "[ WORKING ] TRACING PATHS…"
                  : source
                    ? `[ OK ] VECTORIZED // ${source.width} × ${source.height} // ${result ? `${result.paths} PATHS // ${formatBytes(result.bytes)}` : "…"}`
                    : "[ IDLE ] WAITING FOR AN IMAGE"}
              </span>
              <button
                type="button"
                onClick={reset}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-red/15 active:translate-y-0"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset
              </button>
            </div>
          </section>
        </div>

        <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
          Sources are downscaled to {MAX_TRACE_DIM}px on the long edge before
          tracing. The result is pure SVG paths — scale it to billboard size.
          Runs entirely in your browser.
        </p>
      </div>

      <BrickWall className="mt-14" />
    </main>
  );
}