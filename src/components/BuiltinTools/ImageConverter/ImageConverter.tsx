import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileUp,
  ImageDown,
  ImageUp,
  RotateCcw,
  Wand2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { buttonVariants } from "../../ui/button";import { BrickWall } from "../../decoration/BrickWall";
import { cn } from "../../../utils/cn";
import { pngsToIco } from "../../../utils/ico";
import { DEFAULT_SVG } from "../SvgViewer/SvgViewer";

const INPUT_ACCEPT = ".svg,.png,.jpg,.jpeg,.webp,.gif,.bmp,.ico";
const OUTPUT_FORMATS = ["png", "jpg", "webp", "ico"] as const;
type OutputFormat = (typeof OUTPUT_FORMATS)[number];
type BgMode = "transparent" | "white" | "black" | "paper";

const BG_COLORS: Record<BgMode, string> = {
  transparent: "transparent",
  white: "#FFFFFF",
  black: "#111111",
  paper: "#F5F0E8",
};

const ICO_SIZES = [16, 32, 48, 256];

const EXT_MAP: Record<OutputFormat, string> = {
  png: "png",
  jpg: "jpg",
  webp: "webp",
  ico: "ico",
};

const MIME_MAP: Record<OutputFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  ico: "image/x-icon",
};

interface Source {
  name: string;
  baseName: string;
  kind: "svg" | "raster";
  url: string;
  bytes: number;
  width: number;
  height: number;
  format: string;
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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<{ url: string; blob: Blob; bytes: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lossy = outputFormat === "jpg" || outputFormat === "webp";
  const bgOptions: BgMode[] =
    outputFormat === "jpg" ? ["white", "black", "paper"] : ["transparent", "white", "black", "paper"];

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
      bytes: DEFAULT_SVG.length,
      width: img.naturalWidth,
      height: img.naturalHeight,
      format: "SVG",
    });
  }, []);

  const convert = useCallback(async () => {
    if (!source) return;
    setConverting(true);
    setError(null);
    try {
      const img = await loadImage(source.url);

      if (outputFormat === "ico") {
        const entries = [];
        for (const size of ICO_SIZES) {
          const canvas = drawScaled(img, size, size, bg);
          const png = await canvasToBlob(canvas, "image/png");
          entries.push({ png, size });
        }
        const ico = await pngsToIco(entries);
        setResult({ url: URL.createObjectURL(ico), blob: ico, bytes: ico.size });
      } else {
        const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight, bg);
        const blob = await canvasToBlob(canvas, MIME_MAP[outputFormat], lossy ? quality : undefined);
        setResult({ url: URL.createObjectURL(blob), blob, bytes: blob.size });
      }
    } catch {
      setError("THE WALL WON. THE CONVERSION FAILED — TRY A DIFFERENT FORMAT.");
    } finally {
      setConverting(false);
    }
  }, [source, outputFormat, quality, bg, lossy]);

  useEffect(() => {
    if (source) void convert();
  }, [source, outputFormat, quality, bg, convert]);

  const download = () => {
    if (!result || !source) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `${source.baseName}.${EXT_MAP[outputFormat]}`;
    a.click();
  };

  const reset = () => {
    setSource(null);
    setResult(null);
    setError(null);
    setOutputFormat("png");
    setQuality(0.9);
    setBg("transparent");
  };

  return (
    <main className="py-12" id="main-content">
      <div className="page-container">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          INDEX / TOOLS / IMAGE-CONVERTER
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.95] tracking-tight">
          The image
          <br />
          converter.
        </h1>
        <p className="mt-4 max-w-md text-lg font-medium text-ink/80">
          SVG, PNG, JPG, WEBP, ICO — convert any way. Everything happens in
          your browser. Nothing is uploaded anywhere.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [01] Source
              </h2>
              {source && (
                <Badge variant="blue">{source.format}</Badge>
              )}
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
                    {INPUT_ACCEPT.replace(/\./g, " ").replace(/,/g, " ·")}
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
            </div>

            <div className="mt-5">
              <p className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                <span>Quality</span>
                <span className={cn(!lossy && "text-ink/30")}>
                  {lossy ? `${Math.round(quality * 100)}%` : "LOSS-FREE"}
                </span>
              </p>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.05}
                value={quality}
                disabled={!lossy}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-yellow disabled:opacity-40"
              />
            </div>

            <div className="mt-5">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Background
                {outputFormat === "jpg" && (
                  <span className="text-ink/40"> (JPG has no alpha)</span>
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
              <div className="flex min-h-[140px] items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px]">
                {converting ? (
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                    Crushing…
                  </p>
                ) : result ? (
                  <img
                    src={result.url}
                    alt="Converted preview"
                    className="max-h-36 max-w-full object-contain"
                  />
                ) : (
                  <ImageDown className="h-10 w-10 text-ink/30" aria-hidden="true" />
                )}
              </div>
              <button
                type="button"
                onClick={download}
                disabled={!result || !source}
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40",
                )}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download {result && source ? `${source.baseName}.${EXT_MAP[outputFormat]}` : "converted file"}
              </button>
            </div>

            {error && (
              <Alert variant="error" className="mt-4">
                <AlertTitle>Wall blocked it</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-5 flex items-center gap-3">
              <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-full border-2 border-ink", converting ? "animate-pulse bg-yellow" : "bg-green")} />
                {converting
                  ? "[ WORKING ] CRUSHING PIXELS…"
                  : source
                    ? `[ OK ] ${source.format} → ${outputFormat.toUpperCase()} // ${source.width} × ${source.height} // ${result ? formatBytes(result.bytes) : "…"}`
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
          ICO output embeds 16, 32, 48 and 256 px frames — drop it straight
          into your favicon. All conversions run locally in your browser.
        </p>
      </div>

      <BrickWall className="mt-14" />
    </main>
  );
}