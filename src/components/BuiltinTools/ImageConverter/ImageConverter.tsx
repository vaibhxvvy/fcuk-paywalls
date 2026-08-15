import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileUp,
  ImageDown,
  ImageUp,
  RotateCcw,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { buttonVariants } from "../../ui/button";
import { BrickWall } from "../../decoration/BrickWall";
import { cn } from "../../../utils/cn";
import { pngsToIco } from "../../../utils/ico";
import { DEFAULT_SVG } from "../SvgViewer/SvgViewer";
import { ToolShell } from "../shared/ToolShell";

const INPUT_ACCEPT = ".svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,.ico";
const OUTPUT_FORMATS = ["png", "jpg", "webp", "ico", "svg"] as const;
type OutputFormat = (typeof OUTPUT_FORMATS)[number];
type BgMode = "transparent" | "white" | "black" | "paper";

const BG_COLORS: Record<BgMode, string> = {
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#111111",
  paper: "#F5F0E8",
};

const ICO_SIZES = [16, 32, 48, 256];
const MAX_TRACE_DIM = 1400;

const EXT_MAP: Record<OutputFormat, string> = {
  png: "png",
  jpg: "jpg",
  webp: "webp",
  ico: "ico",
  svg: "svg",
};

const MIME_MAP: Record<OutputFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

interface Source {
  name: string;
  baseName: string;
  kind: "svg" | "raster";
  url: string;
  svgText?: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
}

interface ConvertResult {
  url: string;
  blob: Blob;
  bytes: number;
  paths?: number;
  svgText?: string;
  dims: { width: number; height: number };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = url;
  });
}

function drawScaled(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  bg: BgMode,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  if (BG_COLORS[bg] !== "transparent") {
    ctx.fillStyle = BG_COLORS[bg];
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode-failed"))),
      mime,
      quality,
    );
  });
}

function detectFormat(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ext || "unknown";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ImageConverter() {
  const [source, setSource] = useState<Source | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(0.9);
  const [bg, setBg] = useState<BgMode>("transparent");
  const [colors, setColors] = useState(16);
  const [blur, setBlur] = useState(0);
  const [gapFill, setGapFill] = useState(1.5);
  const [traceRes, setTraceRes] = useState<"auto" | "full">("auto");
  const [thresholdOn, setThresholdOn] = useState(false);
  const [threshold, setThreshold] = useState(128);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showChecker, setShowChecker] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const runIdRef = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const zoomClamped = (z: number) => Math.min(4, Math.max(0.25, Math.round(z * 100) / 100));

  const applyPreset = (preset: "line-art" | "photo") => {
    if (preset === "line-art") {
      setColors(2);
      setBlur(0);
      setTraceRes("full");
      setThresholdOn(true);
      setThreshold(128);
    } else {
      setColors(16);
      setBlur(2);
setTraceRes("auto");
    setThresholdOn(false);
    setThreshold(128);
      setThresholdOn(false);
    }
  };

  const fitPreview = useCallback(() => {
    const el = previewRef.current;
    if (!el || !result) return;
    const pad = 32;
    const scale = Math.min(
      (el.clientHeight - pad) / result.dims.height,
      (el.clientWidth - pad) / result.dims.width,
    );
    setZoom(zoomClamped(scale));
  }, [result]);

  useEffect(() => {
    if (result) fitPreview();
  }, [result, fitPreview]);

  const lossy = outputFormat === "jpg" || outputFormat === "webp";
  const tracing = outputFormat === "svg" && source?.kind !== "svg";
  const passthrough = outputFormat === "svg" && source?.kind === "svg";
  const needsFlatBg = outputFormat === "jpg" || outputFormat === "svg";
  const bgOptions: BgMode[] = needsFlatBg
    ? ["white", "black", "paper"]
    : ["transparent", "white", "black", "paper"];

  useEffect(() => {
    if (needsFlatBg && bg === "transparent") setBg("white");
  }, [needsFlatBg, bg]);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    try {
      if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
        const text = await file.text();
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
        const img = await loadImage(url);
        setSource({
          name: file.name,
          baseName: file.name.replace(/\.svg$/i, ""),
          kind: "svg",
          url,
          svgText: text,
          bytes: text.length,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: "SVG",
        });
      } else {
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        setSource({
          name: file.name,
          baseName: file.name.replace(/\.[^.]+$/, ""),
          kind: "raster",
          url,
          bytes: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: detectFormat(file.name).toUpperCase(),
        });
      }
    } catch {
      setError("THE WALL WON. COULDN'T DECODE THAT FILE — TRY ANOTHER ONE.");
    }
  }, []);

  const loadSample = useCallback(async () => {
    setError(null);
    setResult(null);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_SVG)}`;
    const img = await loadImage(url);
    setSource({
      name: "sample.svg",
      baseName: "sample",
      kind: "svg",
      url,
      svgText: DEFAULT_SVG,
      bytes: DEFAULT_SVG.length,
      width: img.naturalWidth,
      height: img.naturalHeight,
      format: "SVG",
    });
  }, []);

  const convert = useCallback(async () => {
    if (!source) return;
    const id = ++runIdRef.current;
    setConverting(true);
    setError(null);
    try {
      const img = await loadImage(source.url);

      if (outputFormat === "svg") {
        if (source.kind === "svg" && source.svgText) {
          const blob = new Blob([source.svgText], { type: "image/svg+xml" });
          setResult({
            url: URL.createObjectURL(blob),
            blob,
            bytes: blob.size,
            svgText: source.svgText,
            dims: { width: source.width, height: source.height },
          });
        } else {
          const flattenBg = bg === "transparent" ? "#FFFFFF" : BG_COLORS[bg];
          const sourceMaxDim = Math.max(img.naturalWidth, img.naturalHeight);
          const cap = traceRes === "full" ? Math.min(3000, sourceMaxDim) : MAX_TRACE_DIM;
          const scaleFactor = Math.min(1, cap / sourceMaxDim);
          const w = Math.max(1, Math.round(img.naturalWidth * scaleFactor));
          const h = Math.max(1, Math.round(img.naturalHeight * scaleFactor));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.fillStyle = flattenBg;
          ctx.fillRect(0, 0, w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h);

          if (thresholdOn) {
            const px = data.data;
            for (let i = 0; i < px.length; i += 4) {
              const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
              const v = l < threshold ? 0 : 255;
              px[i] = v;
              px[i + 1] = v;
              px[i + 2] = v;
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
          const ImageTracer = (await import("imagetracerjs")).default;
          let svg = ImageTracer.imagedataToSVG(data, {
            numberOfColors: thresholdOn ? 2 : colors,
            blurRadius: thresholdOn ? 0 : blur,
            pathomit: 1,
            ltres: 0.5,
            qtres: 0.5,
          });
          if (gapFill > 0) {
            svg = svg.replace(/stroke-width="1"/g, `stroke-width="${gapFill}"`);
          } else {
            svg = svg.replace(/\s+stroke="[^"]*" stroke-width="1"/g, "");
          }
          if (id !== runIdRef.current) return;

          const blob = new Blob([svg], { type: "image/svg+xml" });
          setResult({
            url: URL.createObjectURL(blob),
            blob,
            bytes: blob.size,
            paths: (svg.match(/<path /g) || []).length,
            svgText: svg,
            dims: { width: w, height: h },
          });
        }
      } else if (outputFormat === "ico") {
        const entries = [];
        for (const size of ICO_SIZES) {
          const canvas = drawScaled(img, size, size, bg);
          const png = await canvasToBlob(canvas, "image/png");
          entries.push({ png, size });
        }
        const ico = await pngsToIco(entries);
        setResult({
          url: URL.createObjectURL(ico),
          blob: ico,
          bytes: ico.size,
          dims: { width: 256, height: 256 },
        });
      } else {
        const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight, bg);
        const blob = await canvasToBlob(canvas, MIME_MAP[outputFormat], lossy ? quality : undefined);
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          bytes: blob.size,
          dims: { width: img.naturalWidth, height: img.naturalHeight },
        });
      }
    } catch {
      if (id === runIdRef.current) {
        setError(
          outputFormat === "svg"
            ? "THE WALL WON. TRACING FAILED — TRY A SIMPLER, FLATTER IMAGE."
            : "THE WALL WON. THE CONVERSION FAILED — TRY A DIFFERENT FORMAT.",
        );
      }
    } finally {
      if (id === runIdRef.current) setConverting(false);
    }
  }, [source, outputFormat, quality, bg, colors, blur, gapFill, traceRes, thresholdOn, threshold, lossy]);

  useEffect(() => {
    if (source) void convert();
  }, [source, outputFormat, quality, bg, colors, blur, gapFill, traceRes, thresholdOn, threshold, convert]);

  const download = () => {
    if (!result || !source) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${source.baseName}.${EXT_MAP[outputFormat]}`;
    a.click();
  };

  const copy = async () => {
    if (!result?.svgText) return;
    await navigator.clipboard.writeText(result.svgText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    runIdRef.current++;
    setSource(null);
    setResult(null);
    setError(null);
    setOutputFormat("png");
    setQuality(0.9);
    setBg("transparent");
    setColors(16);
    setBlur(0);
    setGapFill(1.5);
    setTraceRes("auto");
    setZoom(1);
    setShowChecker(true);
    setConverting(false);
  };

  const statusParts: string[] = [];
  if (source) {
    statusParts.push(`${source.format} → ${outputFormat.toUpperCase()}`);
    if (passthrough) statusParts.push("PASSTHROUGH");
    else if (tracing) {
      if (result) statusParts.push(`${result.paths} PATHS // ${formatBytes(result.bytes)}`);
    } else if (result) {
      statusParts.push(formatBytes(result.bytes));
    }
  }

  return (
    <ToolShell
      crumb="IMAGE-CONVERTER"
      title="The image converter."
      tagline="SVG, PNG, JPG, WEBP, ICO — any way, or trace to SVG. All in your browser."
    >
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
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
                    <ImageUp className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p className="font-display text-xl font-bold uppercase tracking-tight">
                    Drop a file or click to browse
                  </p>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                    SVG · PNG · JPG · WEBP · GIF · BMP · ICO
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
                <div className="mt-4 flex min-h-[240px] items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] p-4">
                  <img
                    src={source.url}
                    alt={source.name}
                    className="max-h-72 max-w-full object-contain"
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70">
                  <dt>File</dt>
                  <dd className="truncate text-right">{source.name}</dd>
                  <dt>Dims</dt>
                  <dd className="text-right">
                    {source.width} × {source.height}
                  </dd>
                  <dt>Size</dt>
                  <dd className="text-right">{formatBytes(source.bytes)}</dd>
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
              [02] Output
            </h2>

            <div className="mt-4">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Format
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {OUTPUT_FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setOutputFormat(format)}
                    className={cn(
                      "rounded-md border-2 border-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-[transform,background-color,box-shadow] duration-200 ease-brutal",
                      outputFormat === format
                        ? "bg-ink text-surface shadow-brutal-sm"
                        : "bg-surface-muted hover:-translate-y-0.5 hover:bg-yellow/30",
                    )}
                  >
                    {format}
                  </button>
                ))}
              </div>
              {tracing && (
                <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
                  SVG output runs the tracer — tune it below.
                </p>
              )}
              {passthrough && (
                <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
                  SVG in, SVG out — served as-is, no tracing needed.
                </p>
              )}
            </div>

            {tracing && (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/60">
                    Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => applyPreset("line-art")}
                    className="rounded-md border-2 border-ink bg-surface-muted px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
                  >
                    Line art
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("photo")}
                    className="rounded-md border-2 border-ink bg-surface-muted px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
                  >
                    Photo
                  </button>
                </div>

                <div className="mt-5">
                  <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                    <span>Colors</span>
                    <span>{colors}</span>
                  </p>
                  <input
                    type="range"
                    min={2}
                    max={32}
                    step={1}
                    value={colors}
                    onChange={(e) => setColors(Number(e.target.value))}
                    className="mt-2 w-full accent-yellow"
                  />
                  <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                    Higher = closer to the original. Lower = flatter, bolder.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                    <span>Trace resolution</span>
                    <span>{traceRes === "full" ? "FULL" : "1400 CAP"}</span>
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTraceRes("auto")}
                      aria-pressed={traceRes === "auto"}
                      className={cn(
                        "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                        traceRes === "auto"
                          ? "bg-ink text-surface shadow-brutal-sm"
                          : "bg-surface-muted hover:bg-yellow/30",
                      )}
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setTraceRes("full")}
                      aria-pressed={traceRes === "full"}
                      className={cn(
                        "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                        traceRes === "full"
                          ? "bg-ink text-surface shadow-brutal-sm"
                          : "bg-surface-muted hover:bg-yellow/30",
                      )}
                    >
                      Full res
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                    Auto caps the scan at 1400px — thin lines in big images
                    vanish. Full res traces at source size: the finest lines
                    survive, but it&apos;s slower. Line art loves full res.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                    <span>Threshold (B/W)</span>
                    <span>{thresholdOn ? threshold : "OFF"}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setThresholdOn(!thresholdOn)}
                      aria-pressed={thresholdOn}
                      className={cn(
                        "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                        thresholdOn
                          ? "bg-ink text-surface shadow-brutal-sm"
                          : "bg-surface-muted hover:bg-yellow/30",
                      )}
                    >
                      {thresholdOn ? "On" : "Off"}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      step={1}
                      value={threshold}
                      disabled={!thresholdOn}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="flex-1 accent-yellow disabled:opacity-40"
                    />
                  </div>
                  <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                    Snaps every pixel to black or white — faded, anti-aliased
                    or thin lines become guaranteed ink that never gets
                    washed out by color quantization.
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
                    0 traces pixel-exact. Raise it to calm noisy photos.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                    <span>Gap fill</span>
                    <span>{gapFill}</span>
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.5}
                    value={gapFill}
                    onChange={(e) => setGapFill(Number(e.target.value))}
                    className="mt-2 w-full accent-yellow"
                  />
                  <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                    Widens each path so neighbours overlap — kills the
                    hairlines between shapes. 1.5 is usually right.
                  </p>
                </div>
              </>
            )}

            {lossy && (
              <div className="mt-5">
                <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                  <span>Quality</span>
                  <span>{Math.round(quality * 100)}%</span>
                </p>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="mt-2 w-full accent-yellow"
                />
              </div>
            )}

            <div className="mt-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Background
                {outputFormat === "jpg" && (
                  <span className="text-ink/40"> (JPG has no alpha)</span>
                )}
                {tracing && (
                  <span className="text-ink/40"> (tracing needs a flat bg)</span>
                )}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {bgOptions.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBg(mode)}
                    className={cn(
                      "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                      bg === mode
                        ? "bg-ink text-surface shadow-brutal-sm"
                        : "bg-surface-muted hover:bg-yellow/30",
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-md border-2 border-ink bg-surface-muted p-4">
              <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                <span>Preview</span>
                <span className="text-ink/30">wants-a-format-first</span>
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoom(zoomClamped(zoom - 0.25))}
                    disabled={!result}
                    aria-label="Zoom out"
                    className="h-9 rounded-md border-2 border-ink bg-white px-2 text-ink transition-transform duration-100 ease-brutal hover:bg-yellow active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ZoomOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={fitPreview}
                    disabled={!result}
                    aria-label="Reset zoom to fit"
                    className="h-9 rounded-md border-2 border-ink bg-white px-2 font-mono text-[11px] font-bold text-ink transition-transform duration-100 ease-brutal hover:bg-yellow active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(zoomClamped(zoom + 0.25))}
                    disabled={!result}
                    aria-label="Zoom in"
                    className="h-9 rounded-md border-2 border-ink bg-white px-2 text-ink transition-transform duration-100 ease-brutal hover:bg-yellow active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ZoomIn className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={fitPreview}
                    disabled={!result}
                    className="h-9 rounded-md border-2 border-ink bg-white px-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-transform duration-100 ease-brutal hover:bg-yellow active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Fit
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChecker(!showChecker)}
                  aria-pressed={showChecker}
                  className={cn(
                    "h-9 rounded-md border-2 border-ink px-2.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color] duration-150 ease-brutal",
                    showChecker ? "bg-yellow text-ink" : "bg-white text-ink hover:bg-yellow/40",
                  )}
                >
                  Checker
                </button>
              </div>
              <div
                ref={previewRef}
                className={cn(
                  "mt-2 flex h-[420px] items-center justify-center overflow-auto rounded-md border-2 border-ink p-4",
                  showChecker
                    ? "bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px]"
                    : "bg-paper",
                )}
              >
                {converting ? (
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                    {tracing ? "Tracing…" : "Crushing…"}
                  </p>
                ) : result ? (
                  <img
                    src={result.url}
                    alt="Converted preview"
                    draggable={false}
                    className="m-auto h-auto max-w-none select-none"
                    style={{ width: Math.max(1, Math.round(result.dims.width * zoom)) }}
                  />
                ) : (
                  <ImageDown className="h-10 w-10 text-ink/30" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {tracing && result?.svgText && (
                  <button
                    type="button"
                    onClick={() => void copy()}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "sm" }),
                      "inline-flex flex-1 items-center justify-center gap-2",
                    )}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {copied ? "Copied" : "Copy SVG"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={download}
                  disabled={!result || !source}
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                    "inline-flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download {result && source ? `${source.baseName}.${EXT_MAP[outputFormat]}` : "converted file"}
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
                    converting ? "animate-pulse bg-yellow" : "bg-green",
                  )}
                />
                {converting
                  ? `[ WORKING ] ${tracing ? "TRACING PATHS…" : "CRUSHING PIXELS…"}`
                  : source
                    ? `[ OK ] ${statusParts.join(" // ")}`
                    : "[ IDLE ] WAITING FOR A FILE"}
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
          ICO output embeds 16, 32, 48 and 256 px frames. Traced sources are
          flattened onto your background, scanned at up to full source
          resolution so thin lines survive — optionally snapped to pure
          black/white first — and drawn as pure SVG paths. All conversions
          run locally in your browser.
        </p>

        <BrickWall className="mt-14" />
    </ToolShell>
  );
}