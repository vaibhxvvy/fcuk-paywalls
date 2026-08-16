import { useRef, useState } from "react";
import { FileDown, Images, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const DPIS = [72, 150, 200, 300];
const FORMATS = ["png", "jpeg", "webp"] as const;

export function PdfToImages() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<{ dataUrl: string; page: number }[]>([]);
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("png");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const mime = (f: (typeof FORMATS)[number]) => (f === "jpeg" ? "image/jpeg" : `image/${f}`);

  const onFile = async (f: File) => {
    setFile(f);
    setError(null);
    setImages([]);
    setStatus("working");
    setProgress(0);
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await f.arrayBuffer();
      const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
      const scale = dpi / 72;
      const out: { dataUrl: string; page: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas blocked");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        out.push({ dataUrl: canvas.toDataURL(mime(format), 0.92), page: i });
        setProgress(Math.round((i / doc.numPages) * 100));
        await new Promise((r) => setTimeout(r, 0));
      }
      setImages(out);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not render that PDF.");
      setStatus("error");
    }
  };

  const base = (file?.name ?? "document").replace(/\.pdf$/i, "");

  const download = (dataUrl: string, name: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = name;
    a.click();
  };

  const downloadAll = async () => {
    for (const img of images) {
      download(img.dataUrl, `${base}-page-${img.page}.${format}`);
      await new Promise((r) => setTimeout(r, 250));
    }
  };

  return (
    <ToolShell
      crumb="PDF-TO-IMAGES"
      title="The snapshots."
      tagline="Every PDF page becomes a crisp PNG, JPG or WebP at the DPI you want. Paid converters sell page packs; a canvas render is free."
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
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {file ? "Pick another PDF" : "Drop or pick a PDF"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Page count matters — 300 DPI makes big files
            </p>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">DPI</span>
              <div className="mt-1 flex gap-1.5">
                {DPIS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDpi(d)}
                    className={
                      d === dpi
                        ? "flex-1 rounded-md border-2 border-ink bg-ink px-1 py-1.5 font-mono text-[9px] font-bold text-paper"
                        : "flex-1 rounded-md border-2 border-ink bg-surface-muted px-1 py-1.5 font-mono text-[9px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                    }
                  >
                    {d}
                  </button>
                ))}
              </div>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Format</span>
              <div className="mt-1 flex gap-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={
                      f === format
                        ? "flex-1 rounded-md border-2 border-ink bg-ink px-1 py-1.5 font-mono text-[9px] font-bold text-paper"
                        : "flex-1 rounded-md border-2 border-ink bg-surface-muted px-1 py-1.5 font-mono text-[9px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            Re-pick the file after changing DPI or format.
          </p>

          {status === "working" && (
            <div className="mt-5 flex flex-col gap-3 rounded-md border-2 border-ink bg-ink p-5">
              <div className="h-5 w-full overflow-hidden rounded-md border-2 border-paper/30 bg-paper/10">
                <div className="h-full bg-yellow transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-paper">
                Rendering pages — {progress}%
              </p>
            </div>
          )}

          {status === "error" && (
            <p className="mt-5 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Snapshots
              <Images className="h-4 w-4" aria-hidden="true" />
            </h2>
            {images.length > 0 && (
              <Button onClick={() => void downloadAll()} size="sm" className="ml-auto uppercase">
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Download all ({images.length})
              </Button>
            )}
          </div>

          {images.length > 0 ? (
            <div className="mt-4 grid flex-1 grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
              {images.map((img) => (
                <div key={img.page} className="flex flex-col gap-1.5">
                  <img src={img.dataUrl} alt={`Page ${img.page}`} className="w-full rounded-sm border-2 border-ink/20" />
                  <button
                    type="button"
                    onClick={() => download(img.dataUrl, `${base}-page-${img.page}.${format}`)}
                    className="rounded-md border-2 border-ink bg-surface px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                  >
                    Page {img.page} ↓
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Page images appear here
                <br />
                <span className="text-[10px] font-semibold">
                  Most PDF→JPG sites sell page packs. This one just renders.
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Rendered locally with pdf.js — unlimited pages, unlimited re-runs.
      </p>
    </ToolShell>
  );
}