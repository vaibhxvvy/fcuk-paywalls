import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Download, FileText, RefreshCcw } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface PageState {
  index: number;
  rotation: number;
}

export function PdfOrganizer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [order, setOrder] = useState<PageState[]>([]);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const srcDocRef = useRef<import("pdf-lib").PDFDocument | null>(null);

  const load = async (file: File) => {
    setBusy(true);
    setError(null);
    setOut(null);
    setName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      srcDocRef.current = src;
      const ths: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
          ths.push(canvas.toDataURL("image/jpeg", 0.6));
        }
        await new Promise((r) => setTimeout(r, 0));
      }
      setThumbs(ths);
      setOrder(Array.from({ length: doc.numPages }, (_, i) => ({ index: i, rotation: 0 })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
    } finally {
      setBusy(false);
    }
  };

  const rotatePage = (pos: number, deg: number) => {
    setOrder((prev) => prev.map((p, i) => (i === pos ? { ...p, rotation: (p.rotation + deg) % 360 } : p)));
  };

  const rotateAll = (deg: number) => {
    setOrder((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + deg) % 360 })));
  };

  const move = (pos: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const j = pos + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[pos], next[j]] = [next[j], next[pos]];
      return next;
    });
  };

  const exportPdf = async () => {
    const src = srcDocRef.current;
    if (!src || order.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, order.map((p) => p.index));
      pages.forEach((p, i) => {
        if (order[i].rotation) p.setRotation(degrees(order[i].rotation));
        out.addPage(p);
      });
      const bytes = await out.save();
      setOut(URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out;
    a.download = `${name.replace(/\.pdf$/i, "") || "organized"}-organized.pdf`;
    a.click();
  };

  return (
    <ToolShell
      crumb="PDF-ORGANIZER"
      title="The reorder."
      tagline="Rotate pages and rearrange the stack — thumbnails, per-page or all at once. Smallpdf doles out 2 tasks a day and charges $12 a month for the third; rotating a page is a flag flip."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The stack
            <FileText className="h-4 w-4" aria-hidden="true" />
          </h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? name : "Pick a PDF"}
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              Pages render as thumbnails — tap ↺ to rotate, arrows to reorder
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />

          {order.length > 0 && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {[90, 180, 270].map((d) => (
                  <Button key={d} variant="secondary" size="sm" onClick={() => rotateAll(d)} className="uppercase">
                    <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                    All {d}°
                  </Button>
                ))}
                <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  {order.length} pages
                </span>
              </div>

              <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-auto pr-1">
                {order.map((p, i) => (
                  <div key={p.index} className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted p-1.5">
                    <img src={thumbs[p.index]} alt={`Page ${p.index + 1}`} className="h-16 w-12 shrink-0 rounded-sm border border-ink object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                        Page {p.index + 1}
                        {p.rotation ? ` · ${p.rotation}°` : ""}
                      </p>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                        Position {i + 1} of {order.length}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        onClick={() => rotatePage(i, 90)}
                        aria-label={`Rotate page ${p.index + 1}`}
                        title="Rotate 90°"
                        className="rounded-md border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/40"
                      >
                        ↺
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move page ${p.index + 1} earlier`}
                        className="rounded-md border-2 border-ink px-1 py-0.5 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/40 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === order.length - 1}
                        aria-label={`Move page ${p.index + 1} later`}
                        className="rounded-md border-2 border-ink px-1 py-0.5 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/40 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => void exportPdf()} disabled={busy} className="mt-4 w-full uppercase">
                {busy ? "Working…" : "Apply rotations + order"}
              </Button>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Organized out</h2>
          {out ? (
            <>
              <object data={out} type="application/pdf" className="mt-4 h-96 w-full rounded-md border-2 border-ink bg-surface-muted" />
              <Button onClick={download} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download organized PDF
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The reordered file appears here — rotations and order, applied locally
              </p>
            </div>
          )}
          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Built with pdf-lib — rotations are stored metadata, so quality is untouched.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The quota-counting PDF sites make you wait a day for a 90° turn; the turn was always free.
      </p>
    </ToolShell>
  );
}