import { useEffect, useRef, useState } from "react";
import { Eraser, FileDown, Trash2, Undo2, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SCALE = 1.5;

export function PdfRedactor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<{ doc: unknown; buf: ArrayBuffer } | null>(null);
  const boxesRef = useRef<Record<number, Box[]>>({});
  const pageRef = useRef(1);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draftRef = useRef<Box | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [boxes, setBoxes] = useState<Record<number, Box[]>>({});
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  const draw = () => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !base || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.fillStyle = "#111";
    for (const b of boxesRef.current[pageRef.current] ?? []) ctx.fillRect(b.x, b.y, b.w, b.h);
    const d = draftRef.current;
    if (d) {
      ctx.fillStyle = "rgba(17,17,17,0.65)";
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }
  };

  const renderPage = async (n: number) => {
    const canvas = canvasRef.current;
    const base = baseRef.current;
    const doc = docRef.current?.doc as { getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<unknown> } }> } | null;
    if (!canvas || !base || !doc) return;
    const p = await doc.getPage(n);
    const vp = p.getViewport({ scale: SCALE });
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    base.width = Math.floor(vp.width);
    base.height = Math.floor(vp.height);
    const bctx = base.getContext("2d");
    if (!bctx) return;
    await p.render({ canvasContext: bctx, viewport: vp }).promise;
    pageRef.current = n;
    draw();
  };

  useEffect(() => {
    if (docRef.current) void renderPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onFile = async (f: File) => {
    setFile(f);
    setError(null);
    setBoxes({});
    setStatus("working");
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await f.arrayBuffer();
      const doc = await getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      docRef.current = { doc, buf };
      setNumPages(doc.numPages);
      setPage(1);
      setStatus("idle");
      void renderPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
      setStatus("error");
    }
  };

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toCanvas(e);
    startRef.current = p;
    draftRef.current = { x: p.x, y: p.y, w: 0, h: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!startRef.current) return;
    const p = toCanvas(e);
    const s = startRef.current;
    draftRef.current = {
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    };
    draw();
  };

  const onPointerUp = () => {
    const d = draftRef.current;
    draftRef.current = null;
    startRef.current = null;
    if (!d || d.w < 4 || d.h < 4) {
      draw();
      return;
    }
    const n = pageRef.current;
    setBoxes((m) => ({ ...m, [n]: [...(m[n] ?? []), d] }));
  };

  const undoBox = () => {
    const n = pageRef.current;
    setBoxes((m) => ({ ...m, [n]: (m[n] ?? []).slice(0, -1) }));
  };

  const clearPage = () => {
    const n = pageRef.current;
    setBoxes((m) => ({ ...m, [n]: [] }));
  };

  const totalBoxes = Object.values(boxes).reduce((s, bs) => s + bs.length, 0);
  const pageBoxes = (boxes[page] ?? []).length;

  const onExport = async () => {
    setStatus("working");
    setError(null);
    try {
      const { PDFDocument, rgb } = await import("pdf-lib");
      const src = await PDFDocument.load(docRef.current!.buf);
      const out = await PDFDocument.create();
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((pg) => out.addPage(pg));
      for (const [key, bs] of Object.entries(boxesRef.current)) {
        const idx = Number(key) - 1;
        const pg = out.getPage(idx);
        const h = pg.getHeight();
        for (const b of bs) {
          pg.drawRectangle({
            x: b.x / SCALE,
            y: h - (b.y + b.h) / SCALE,
            width: b.w / SCALE,
            height: b.h / SCALE,
            color: rgb(0, 0, 0),
          });
        }
      }
      const bytes = await out.save();
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(file?.name ?? "document").replace(/\.pdf$/i, "")}-redacted.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not redact that PDF.");
      setStatus("error");
    }
  };

  return (
    <ToolShell
      crumb="PDF-REDACTOR"
      title="The blackout."
      tagline="Drag black boxes over anything sensitive, download the redacted PDF. Redactable charges a subscription; a filled rectangle is a filled rectangle."
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
              Drag over text you never want read again
            </p>
          </button>

          {file && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                {file.name}
              </span>
              <span className="rounded-md border-2 border-ink bg-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-paper">
                {totalBoxes} box{totalBoxes === 1 ? "" : "es"}
              </span>
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
              [02] Page {numPages > 0 ? `${page} / ${numPages}` : ""}
              <Eraser className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(numPages, p + 1))}
                disabled={page >= numPages}
                className="rounded-md border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next
              </button>
              <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden="true" />
              <button
                type="button"
                onClick={undoBox}
                disabled={pageBoxes === 0}
                title="Undo last box on this page"
                className="rounded-md border-2 border-ink p-1.5 text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={clearPage}
                disabled={pageBoxes === 0}
                title="Clear this page"
                className="rounded-md border-2 border-ink p-1.5 text-ink transition-colors duration-200 ease-brutal hover:bg-red/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="max-w-full touch-none select-none"
              style={{ cursor: "crosshair" }}
            />
            <canvas ref={baseRef} className="hidden" />
          </div>

          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Click and drag to paint a box — {pageBoxes} on this page
          </p>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button
          onClick={onExport}
          disabled={totalBoxes === 0 || status === "working"}
          className="uppercase"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          {status === "working" ? "Redacting…" : "Download redacted PDF"}
        </Button>
        {totalBoxes === 0 && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Blackout at least one box first.
          </p>
        )}
        {status === "done" && (
          <p className="rounded-md border-2 border-ink bg-green/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
            Redacted copy downloaded — the boxes are burned in.
          </p>
        )}
        {status === "error" && (
          <p className="rounded-md border-2 border-ink bg-red/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
            [ ERROR ] {error}
          </p>
        )}
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Rendered locally with pdf.js, re-stamped with pdf-lib — nothing ever leaves this tab.
      </p>
    </ToolShell>
  );
}