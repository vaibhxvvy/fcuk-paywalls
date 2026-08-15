import { useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileUp,
  RotateCcw,
  Shapes,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Button, buttonVariants } from "../../ui/button";
import { BrickWall } from "../../decoration/BrickWall";
import { cn } from "../../../utils/cn";

export const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#F5F0E8"/>
  <rect x="40" y="40" width="320" height="220" fill="#FFFFFF" stroke="#111111" stroke-width="6"/>
  <rect x="40" y="40" width="200" height="60" fill="#FFD84D" stroke="#111111" stroke-width="6"/>
  <text x="60" y="82" font-family="Arial, sans-serif" font-size="36" font-weight="900" fill="#111111">FCUK</text>
  <rect x="240" y="40" width="120" height="60" fill="#FF5A5F" stroke="#111111" stroke-width="6"/>
  <circle cx="90" cy="160" r="30" fill="#4D8DFF" stroke="#111111" stroke-width="6"/>
  <rect x="150" y="140" width="60" height="40" fill="#65D68A" stroke="#111111" stroke-width="6"/>
  <path d="M240 190 L300 140 L360 190 Z" fill="#111111"/>
  <rect x="60" y="230" width="280" height="20" fill="#111111"/>
</svg>`;

interface SvgMeta {
  width: number | null;
  height: number | null;
  elements: number;
  bytes: number;
}

function parseSvgMeta(svg: string): SvgMeta | null {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return null;
    const root = doc.documentElement;
    if (root?.tagName.toLowerCase() !== "svg") return null;
    const w = parseFloat(root.getAttribute("width") ?? "");
    const h = parseFloat(root.getAttribute("height") ?? "");
    return {
      width: Number.isFinite(w) ? w : null,
      height: Number.isFinite(h) ? h : null,
      elements: root.getElementsByTagName("*").length,
      bytes: new Blob([svg]).size,
    };
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

export function SvgViewer() {
  const [svgCode, setSvgCode] = useState(DEFAULT_SVG);
  const [zoom, setZoom] = useState(1);
  const [checker, setChecker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const meta = useMemo(() => parseSvgMeta(svgCode), [svgCode]);
  const invalid = meta === null || renderError;

  const previewSrc = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode)}`,
    [svgCode],
  );

  function setZoomClamped(next: number) {
    setZoom(Math.min(4, Math.max(0.25, Math.round(next * 4) / 4)));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setSvgCode(text);
      setRenderError(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(svgCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preview.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  const previewWidth = meta?.width ? meta.width * zoom : 320 * zoom;

  return (
    <main className="py-12" id="main-content">
      <div className="page-container">
        <a
          href="#/tools"
          target="_self"
          className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-yellow/50 hover:shadow-brutal-sm active:translate-x-0 active:translate-y-0 active:shadow-none"
        >
          ← Back to tools
        </a>
        <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          INDEX / TOOLS / SVG-VIEWER
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[clamp(2.75rem,8vw,6rem)] font-bold uppercase leading-[0.95] tracking-tight">
            The SVG
            <br />
            viewer.
          </h1>
          <div className="flex flex-col items-start gap-2">
            <Badge variant="green">Live</Badge>
            <Badge variant="yellow">Tool 01</Badge>
          </div>
        </div>
        <p className="mt-4 max-w-md text-lg font-medium text-ink/80">
          Paste. Preview. Steal. No upload servers, no accounts — it all stays
          in your browser.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section
            aria-label="SVG input"
            className="flex flex-col gap-4 rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-lg sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="svg-code-input"
                className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70"
              >
                [ 01 ] SVG CODE
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSvgCode(DEFAULT_SVG);
                    setRenderError(false);
                  }}
                  className="uppercase"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Example
                </Button>
                <label
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "cursor-pointer uppercase",
                  )}
                >
                  <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                  SVG file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="sr-only"
                    aria-label="Upload an SVG file"
                    onChange={handleFile}
                  />
                </label>
              </div>
            </div>

            <textarea
              id="svg-code-input"
              value={svgCode}
              onChange={(e) => {
                setSvgCode(e.target.value);
                setRenderError(false);
              }}
              spellCheck={false}
              aria-label="SVG code"
              className="h-[320px] w-full resize-y rounded-md border-[3px] border-ink bg-white p-3 font-mono text-xs leading-relaxed text-ink transition-[box-shadow,transform] duration-150 ease-brutal focus:outline-none focus:-translate-x-[2px] focus:-translate-y-[2px] focus:shadow-brutal-sm"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSvgCode("")}
                className="uppercase"
              >
                Clear
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopy}
                  className="uppercase"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="ink"
                  size="sm"
                  onClick={handleDownload}
                  className="uppercase"
                  disabled={invalid}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download
                </Button>
              </div>
            </div>
          </section>

          <section
            aria-label="SVG preview"
            className="flex flex-col gap-4 rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-lg sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/70">
                [ 02 ] PREVIEW
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setZoomClamped(zoom - 0.25)}
                  aria-label="Zoom out"
                  className="h-9 w-9"
                >
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </Button>
                <button
                  type="button"
                  onClick={() => setZoomClamped(1)}
                  className="h-9 rounded-md border-2 border-ink bg-white px-2 font-mono text-[11px] font-bold text-ink transition-transform duration-100 ease-brutal hover:bg-yellow active:translate-y-[2px]"
                  aria-label="Reset zoom to 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => setZoomClamped(zoom + 0.25)}
                  aria-label="Zoom in"
                  className="h-9 w-9"
                >
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant={checker ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setChecker(!checker)}
                  aria-pressed={checker}
                  className="uppercase"
                >
                  Checker
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "flex h-[320px] items-center justify-center overflow-auto rounded-md border-2 border-ink p-6",
                checker
                  ? "bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px]"
                  : "bg-paper",
              )}
            >
              {invalid ? (
                <div className="max-w-sm text-center">
                  <Shapes
                    className="mx-auto h-10 w-10 text-ink/40"
                    aria-hidden="true"
                  />
                  <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                    Nothing to render
                  </p>
                </div>
              ) : (
                <img
                  src={previewSrc}
                  alt="SVG preview"
                  draggable={false}
                  onError={() => setRenderError(true)}
                  style={{ width: previewWidth }}
                  className="h-auto max-w-full select-none"
                />
              )}
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest"
              aria-live="polite"
            >
              <span
                className={cn(
                  "rounded-sm border-2 border-ink px-2 py-0.5",
                  invalid ? "bg-red text-ink" : "bg-green text-ink",
                )}
              >
                {invalid ? "[ ERR ] INVALID SVG" : "[ OK ] RENDERED"}
              </span>
              {meta && (
                <span className="text-ink/60">
                  {formatBytes(meta.bytes)} //{" "}
                  {meta.width && meta.height
                    ? `${meta.width} × ${meta.height}`
                    : "auto"} // {meta.elements} ELEMENTS
                </span>
              )}
            </div>

            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
              [ SAFETY ] Rendered as a flat image — scripts inside SVG never
              run.
            </p>
          </section>
        </div>

        {invalid && (
          <Alert variant="error" className="mt-8">
            <AlertTitle>Invalid SVG.</AlertTitle>
            <AlertDescription>
              The wall won&apos;t render that. Check the code for a missing{" "}
              <code className="rounded-sm border border-ink bg-white px-1 font-mono">
                &lt;svg&gt;
              </code>{" "}
              root or broken syntax — or load the example to see how it works.
            </AlertDescription>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 uppercase"
              onClick={() => {
                setSvgCode(DEFAULT_SVG);
                setRenderError(false);
              }}
            >
              Try the example
            </Button>
          </Alert>
        )}
      </div>

      <BrickWall className="mt-14" />
    </main>
  );
}