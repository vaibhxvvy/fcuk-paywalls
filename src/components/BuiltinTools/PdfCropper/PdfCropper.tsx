import { useRef, useState } from "react";
import { Crop, FileText, Upload } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { renderPdfPreview } from "../shared/pdfPreview";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const MAX_SIDE = 150;

export function PdfCropper() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  const [size, setSize] = useState<string>("");
  const [left, setLeft] = useState(20);
  const [right, setRight] = useState(20);
  const [top, setTop] = useState(20);
  const [bottom, setBottom] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = async (f: File) => {
    setError(null);
    setDone(null);
    setPreview(null);
    setPages(0);
    setSize("");
    try {
      const buf = await f.arrayBuffer();
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const src = await getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      const p1 = await src.getPage(1);
      const vp = p1.getViewport({ scale: 1 });
      setSize(`${Math.round(vp.width)}×${Math.round(vp.height)} pt`);
      setPages(src.numPages);
      const img = await renderPdfPreview(new Uint8Array(buf.slice(0)));
      setPreview(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the PDF.");
    }
  };

  const apply = async (f: File | null, override: { l: number; r: number; t: number; b: number } | null = null) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const l = override?.l ?? left;
      const r = override?.r ?? right;
      const t = override?.t ?? top;
      const b = override?.b ?? bottom;
      const buf = await f.arrayBuffer();
      const src = await PDFDocument.load(buf.slice(0));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, src.getPageIndices());
      copied.forEach((page) => {
        const box = page.getMediaBox();
        const w = box.width - l - r;
        const h = box.height - t - b;
        if (w <= 0 || h <= 0) throw new Error("CROP WIDER THAN THE PAGE");
        page.setMediaBox(box.x + l, box.y + b, w, h);
      });
      copied.forEach((p) => out.addPage(p));
      const bytes = await out.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
      const a = document.createElement("a");
      a.download = f.name.replace(/\.pdf$/i, "") + "-cropped.pdf";
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(`[ OK ] ${src.getPageCount()} PAGES CROPPED — ${(blob.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed.");
    } finally {
      setBusy(false);
    }
  };

  const slider = (label: string, value: number, onChange: (v: number) => void) => (
    <label className="mt-3 block">
      <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
        {label}
        <span className="text-ink">{value} pt</span>
      </span>
      <input
        type="range"
        min={0}
        max={MAX_SIDE}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-yellow"
      />
    </label>
  );

  const wPct = preview && size ? Math.max(0, (100 * (parseInt(size, 10) - left - right)) / parseInt(size, 10)) : 0;
  const hPct = preview && size ? Math.max(0, (100 * (parseInt(size.split("×")[1] ?? "0", 10) - top - bottom)) / parseInt(size.split("×")[1] ?? "1", 10)) : 0;
  const lPct = Math.min(100, (100 * left) / parseInt(size || "595", 10));
  const tPct = Math.min(100, (100 * top) / parseInt(size.split("×")[1] || "842", 10));

  return (
    <ToolShell
      crumb="PDF-CROPPER"
      title="The guillotine."
      tagline="Trim the margins off every page of a PDF in one click — white space eats the print budget. iLovePDF keeps 'Crop PDF' behind Premium (~$7/mo); shrinking a MediaBox is a subtraction."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The document</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {pages > 0 ? `PDF loaded — ${pages} page${pages === 1 ? "" : "s"}` : "Pick a PDF"}
            </p>
            {size && <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">{size}</p>}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}

          <h2 className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The cut</h2>
          <div className="grid grid-cols-2 gap-x-4">
            {slider("Left", left, setLeft)}
            {slider("Right", right, setRight)}
            {slider("Top", top, setTop)}
            {slider("Bottom", bottom, setBottom)}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              { label: "All 0", v: { l: 0, r: 0, t: 0, b: 0 } },
              { label: "All 20", v: { l: 20, r: 20, t: 20, b: 20 } },
              { label: "All 36", v: { l: 36, r: 36, t: 36, b: 36 } },
              { label: "All 72", v: { l: 72, r: 72, t: 72, b: 72 } },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setLeft(p.v.l);
                  setRight(p.v.r);
                  setTop(p.v.t);
                  setBottom(p.v.b);
                }}
                className="rounded-md border-2 border-ink bg-surface-muted px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The preview</h2>

          {preview ? (
            <div className="relative mt-4 flex-1 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
              <img src={preview ?? undefined} alt="Page 1 with crop overlay" className="mx-auto block max-h-[380px] max-w-full" />
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <path
                  d={`M0 0 H100 V100 H0 Z M${lPct} ${tPct} H${lPct + Math.max(1, wPct)} V${tPct + Math.max(1, hPct)} H${lPct} Z`}
                  fill="rgba(17,17,17,0.35)"
                  fillRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
                <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                  Page 1 preview with the cut marked — everything outside the box gets trimmed
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={() => inputRef.current?.files?.[0] && void apply(inputRef.current.files[0])}
            disabled={busy || pages === 0}
            className="mt-4 w-full uppercase"
          >
            <Crop className="h-4 w-4" aria-hidden="true" />
            {busy ? "Cropping…" : "Crop all pages → download"}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            The cropped file keeps the original content — only the visible page box shrinks, so text
            stays selectable and links keep working.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}