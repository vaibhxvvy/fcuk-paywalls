import { useRef, useState } from "react";
import { FileDown, FileUp } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

export function PdfCompressor() {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [info, setInfo] = useState<{ before: number; after: number; pages: number } | null>(null);
  const [dpi, setDpi] = useState(110);
  const [quality, setQuality] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outUrlRef = useRef<string | null>(null);
  const [outName, setOutName] = useState("compressed.pdf");

  const compress = async (file: File) => {
    setStatus("working");
    setProgress(0);
    setError(null);
    setInfo(null);
    try {
      const [{ PDFDocument }, { getDocument, GlobalWorkerOptions }] = await Promise.all([
        import("pdf-lib"),
        import("pdfjs-dist"),
      ]);
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;

      const arrayBuf = await file.arrayBuffer();
      const src = await getDocument({ data: new Uint8Array(arrayBuf) }).promise;
      const out = await PDFDocument.create();
      const pageCount = src.numPages;

      for (let i = 1; i <= pageCount; i++) {
        const page = await src.getPage(i);
        const viewport = page.getViewport({ scale: dpi / 72 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        const jpeg = canvas.toDataURL("image/jpeg", quality);
        const jpegBytes = await (await fetch(jpeg)).arrayBuffer();
        const img = await out.embedJpg(jpegBytes as ArrayBuffer);
        const w = canvas.width;
        const h = canvas.height;
        const newPage = out.addPage([w, h]);
        newPage.drawImage(img, {
          x: 0,
          y: 0,
          width: w,
          height: h,
        });
        setProgress(Math.round((i / pageCount) * 100));
      }

      const bytes = await out.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
      outUrlRef.current = URL.createObjectURL(blob);
      setOutName(file.name.replace(/\.pdf$/i, "") + "-compressed.pdf");
      setInfo({ before: arrayBuf.byteLength, after: blob.size, pages: pageCount });
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to compress that PDF.");
      setStatus("error");
    }
  };

  const download = () => {
    if (!outUrlRef.current) return;
    const a = document.createElement("a");
    a.href = outUrlRef.current;
    a.download = outName;
    a.click();
  };

  const pct = info ? Math.round((1 - info.after / info.before) * 100) : 0;

  return (
    <ToolShell
      crumb="PDF-COMPRESSOR"
      title="The slimmer."
      tagline="Shrink a PDF in your browser — no two-per-day quota, no watermark on the output."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <FileUp className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void compress(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-12 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {status === "idle" ? "Drop or pick a PDF" : "Pick another PDF"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Rendered at {dpi} DPI · JPEG quality {Math.round(quality * 100)}% — all in your tab
            </p>
          </button>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Render DPI — {dpi}
              </span>
              <input
                type="range"
                min={60}
                max={160}
                step={5}
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                JPEG quality — {Math.round(quality * 100)}%
              </span>
              <input
                type="range"
                min={0.3}
                max={0.95}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <p className="rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
              Lower DPI + quality = smaller file, softer text. This is what most
              "compressors" do server-side — we do it here, for free, unlimited.
            </p>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Output
            <FileDown className="h-4 w-4" aria-hidden="true" />
          </h2>

          {status === "working" && (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-4 rounded-md border-2 border-ink bg-ink p-6">
              <div className="h-5 w-full overflow-hidden rounded-md border-2 border-paper/30 bg-paper/10">
                <div className="h-full bg-yellow transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-paper">
                Rendering page {Math.max(1, Math.round((progress / 100) * (info?.pages ?? 1)))}
                {info ? ` of ${info.pages}` : ""} — {progress}%
              </p>
            </div>
          )}

          {status === "done" && info && (
            <>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-md border-2 border-ink bg-surface-muted p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Before</p>
                  <p className="mt-1 font-mono text-sm font-bold text-ink">{(info.before / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="rounded-md border-2 border-ink bg-surface-muted p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">After</p>
                  <p className="mt-1 font-mono text-sm font-bold text-green">{(info.after / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="rounded-md border-2 border-ink bg-surface-muted p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Saved</p>
                  <p className={cn("mt-1 font-mono text-sm font-bold", pct > 0 ? "text-green" : "text-red")}>
                    {pct > 0 ? `${pct}%` : "0%"}
                  </p>
                </div>
              </div>
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {info.pages} page{info.pages === 1 ? "" : "s"} · no watermark · no signup
              </p>
              <Button onClick={download} className="mt-auto w-full uppercase">
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Download {outName}
              </Button>
            </>
          )}

          {status === "error" && (
            <p className="mt-6 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}

          {status === "idle" && (
            <div className="mt-6 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Results appear here
                <br />
                <span className="text-[10px] font-semibold">
                  The file stays in your tab — Smallpdf can't count your tasks if it never sees your file.
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Rendered locally with pdf.js — the compressor with no daily quota and no watermark.
      </p>
    </ToolShell>
  );
}