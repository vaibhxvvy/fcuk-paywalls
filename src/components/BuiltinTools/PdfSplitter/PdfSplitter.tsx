import { useRef, useState } from "react";
import { FileDown, Scissors, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface SplitResult {
  label: string;
  name: string;
  blob: Blob;
}

export function PdfSplitter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<{ doc: unknown; buf: ArrayBuffer; numPages: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [rangeInput, setRangeInput] = useState("");
  const [splits, setSplits] = useState<SplitResult[]>([]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const toggle = (i: number) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  const selectAll = () => setSelected(docRef.current ? Array.from({ length: docRef.current.numPages }, (_, i) => i) : []);
  const selectOdd = () =>
    setSelected(docRef.current ? Array.from({ length: docRef.current.numPages }, (_, i) => i).filter((i) => i % 2 === 0) : []);
  const selectEven = () =>
    setSelected(docRef.current ? Array.from({ length: docRef.current.numPages }, (_, i) => i).filter((i) => i % 2 === 1) : []);
  const selectNone = () => setSelected([]);

  const onFile = async (f: File) => {
    setFile(f);
    setError(null);
    setSelected([]);
    setSplits([]);
    setRangeInput("");
    setStatus("working");
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await f.arrayBuffer();
      const doc = await getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      docRef.current = { doc, buf, numPages: doc.numPages };
      const imgs: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas blocked");
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        imgs.push(canvas.toDataURL("image/png"));
        setStatus("working");
      }
      setThumbs(imgs);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
      setStatus("error");
    }
  };

  const makeDoc = async (pages: number[]): Promise<Blob> => {
    const { PDFDocument } = await import("pdf-lib");
    const src = await PDFDocument.load(docRef.current!.buf);
    const out = await PDFDocument.create();
    const copies = await out.copyPages(src, pages);
    copies.forEach((pg) => out.addPage(pg));
    const bytes = await out.save();
    return new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const onExtract = async () => {
    if (selected.length === 0) return;
    setStatus("working");
    setError(null);
    try {
      const blob = await makeDoc([...selected].sort((a, b) => a - b));
      downloadBlob(blob, `${(file?.name ?? "document").replace(/\.pdf$/i, "")}-extracted.pdf`);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not extract.");
      setStatus("error");
    }
  };

  const parseRanges = (s: string): number[][] => {
    const n = docRef.current?.numPages ?? 0;
    const out: number[][] = [];
    for (const part of s.split(",")) {
      const t = part.trim();
      if (!t) continue;
      const m = t.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = Math.max(1, Math.min(n, Number(m[1])));
        const b = Math.max(1, Math.min(n, Number(m[2])));
        out.push(Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => Math.min(a, b) + i - 1));
      } else if (/^\d+$/.test(t)) {
        const p = Number(t);
        if (p >= 1 && p <= n) out.push([p - 1]);
      }
    }
    return out;
  };

  const onSplitRanges = async () => {
    const ranges = parseRanges(rangeInput);
    if (ranges.length === 0) {
      setError("No valid ranges — try something like 1-3, 5, 7-9");
      setStatus("error");
      return;
    }
    setStatus("working");
    setError(null);
    try {
      const base = (file?.name ?? "document").replace(/\.pdf$/i, "");
      const results: SplitResult[] = [];
      for (let r = 0; r < ranges.length; r++) {
        const blob = await makeDoc(ranges[r]);
        results.push({
          label: ranges[r].map((i) => i + 1).join("-"),
          name: `${base}-part-${r + 1}.pdf`,
          blob,
        });
      }
      setSplits(results);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not split.");
      setStatus("error");
    }
  };

  return (
    <ToolShell
      crumb="PDF-SPLITTER"
      title="The cut."
      tagline="Tear a PDF apart by page — extract a selection into one file or split ranges into separate PDFs. Smallpdf gives you two tasks a day; this one never runs out."
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
              Every page becomes a thumbnail — click to pick
            </p>
          </button>

          {file && (
            <p className="mt-4 truncate rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
              {file.name} · {docRef.current?.numPages ?? "?"} pages
            </p>
          )}

          {status === "error" && (
            <p className="mt-5 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Pages
              <Scissors className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className="ml-auto flex flex-wrap gap-1.5">
              <button type="button" onClick={selectAll} className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30">
                All
              </button>
              <button type="button" onClick={selectOdd} className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30">
                Odd
              </button>
              <button type="button" onClick={selectEven} className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30">
                Even
              </button>
              <button type="button" onClick={selectNone} className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30">
                None
              </button>
            </div>
          </div>

          <div className="mt-4 grid max-h-[32rem] flex-1 grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
            {thumbs.map((src, i) => {
              const on = selected.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  title={`Page ${i + 1}`}
                  className={
                    on
                      ? "relative rounded-md border-[3px] border-ink bg-yellow p-0.5 shadow-brutal-sm"
                      : "relative rounded-md border-[3px] border-ink/30 p-0.5 transition-[border-color,transform] duration-200 ease-brutal hover:-translate-y-0.5 hover:border-ink"
                  }
                >
                  <img src={src} alt={`Page ${i + 1}`} className="w-full rounded-sm" />
                  <span
                    className={
                      on
                        ? "absolute top-1 left-1 rounded-sm bg-ink px-1 font-mono text-[9px] font-bold text-yellow"
                        : "absolute top-1 left-1 rounded-sm bg-surface px-1 font-mono text-[9px] font-bold text-ink/60"
                    }
                  >
                    {i + 1}
                  </span>
                </button>
              );
            })}
            {thumbs.length === 0 && (
              <p className="col-span-full p-6 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink/30">
                Page thumbnails land here
              </p>
            )}
          </div>

          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            {selected.length} of {docRef.current?.numPages ?? 0} pages picked
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] Extract selection</h2>
          <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            The pages you picked become one new PDF
          </p>
          <Button onClick={onExtract} disabled={selected.length === 0 || status === "working"} className="mt-4 uppercase">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Extract {selected.length > 0 ? `${selected.length} page${selected.length === 1 ? "" : "s"}` : ""}
          </Button>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[04] Split by ranges</h2>
          <div className="mt-2 flex gap-2">
            <input
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="1-3, 5, 7-9"
              className="min-w-0 flex-1 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
            <Button onClick={onSplitRanges} disabled={status === "working"} className="uppercase">
              Split
            </Button>
          </div>
          {splits.length > 0 && (
            <div className="mt-4 space-y-2">
              {splits.map((s) => (
                <div key={s.name} className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                    pages {s.label} → {s.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadBlob(s.blob, s.name)}
                    className="rounded-md border-2 border-ink bg-yellow px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-transform duration-200 ease-brutal hover:-translate-y-0.5"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        pdf.js thumbnails + pdf-lib surgery — no 2-tasks-a-day meter, no watermark.
      </p>
    </ToolShell>
  );
}