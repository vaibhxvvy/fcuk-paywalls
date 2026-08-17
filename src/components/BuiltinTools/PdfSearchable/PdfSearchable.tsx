import { useRef, useState } from "react";
import { FileDown, FileSearch, FileText, Languages } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";

const LANGS = [
  { id: "eng", label: "English" },
  { id: "fra", label: "Français" },
  { id: "deu", label: "Deutsch" },
  { id: "spa", label: "Español" },
  { id: "ita", label: "Italiano" },
  { id: "por", label: "Português" },
  { id: "nld", label: "Nederlands" },
  { id: "pol", label: "Polski" },
];

export function PdfSearchable() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [pages, setPages] = useState(0);
  const [lang, setLang] = useState("eng");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setError(null);
    setDone(null);
    setName(file.name);
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await file.arrayBuffer();
      const doc = await getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
      setPages(doc.numPages);

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
          setStatus(m.status);
        },
      });

      try {
        const { PDFDocument, StandardFonts } = await import("pdf-lib");
        const out = await PDFDocument.create();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const font = await out.embedFont(StandardFonts.Helvetica);
        let words = 0;

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable.");
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;

          const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b as Blob), "image/png"));
          const { data } = await worker.recognize(blob);

          const outPage = out.addPage((await out.copyPages(src, [i - 1]))[0]);
          const pageW = outPage.getWidth();
          const pageH = outPage.getHeight();
          const sx = pageW / viewport.width;
          const sy = pageH / viewport.height;
          for (const block of data.blocks ?? []) {
            for (const para of block.paragraphs ?? []) {
              for (const line of para.lines ?? []) {
                for (const w of line.words ?? []) {
                  const text = w.text.replace(/[^\x20-\xFF]/g, "").trim();
                  if (!text) continue;
                  const b = w.bbox;
                  const size = Math.max(4, (b.y1 - b.y0) * sy * 0.8);
                  outPage.drawText(text, {
                    x: b.x0 * sx,
                    y: pageH - b.y1 * sy,
                    size,
                    font,
                    color: undefined,
                    opacity: 0,
                  });
                  words += 1;
                }
              }
            }
          }
          setProgress(Math.round((i / doc.numPages) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }

        await worker.terminate();
        const bytes = await out.save();
        const blobOut = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
        const a = document.createElement("a");
        a.download = file.name.replace(/\.pdf$/i, "") + "-searchable.pdf";
        a.href = URL.createObjectURL(blobOut);
        a.click();
        URL.revokeObjectURL(a.href);
        setDone(`[ OK ] ${doc.numPages} PAGES, ${words} WORDS INDEXED, ${(blobOut.size / 1024).toFixed(0)} KB`);
      } finally {
        await worker.terminate().catch(() => undefined);
      }
      setStatus(null);
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed — language data may need a network fetch on first run.");
      setBusy(false);
      setStatus(null);
    }
  };

  return (
    <ToolShell
      crumb="PDF-SEARCHABLE"
      title="The indexer."
      tagline="Make a scanned PDF searchable — every word lands as an invisible text layer you can find, copy and Ctrl-F. Acrobat Pro charges ~$29.99 a month for scan & OCR; the words were always already in the image."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Scanned PDF
            <FileSearch className="h-4 w-4" aria-hidden="true" />
          </h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? name : "Pick a scanned PDF"}
            </p>
            {pages > 0 && (
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {pages} pages · OCR runs here, nothing uploads
              </p>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(f);
              e.target.value = "";
            }}
          />

          <div className="mt-4">
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              <Languages className="h-3.5 w-3.5" aria-hidden="true" />
              OCR language
            </span>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  className={`rounded-md border-2 border-ink px-1.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal ${
                    lang === l.id ? "bg-yellow" : "bg-surface-muted hover:bg-yellow/40"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {busy && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  {status ?? "Indexing…"}
                </span>
                <span className="font-mono text-xs font-bold text-ink/60">{progress}%</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-sm border-2 border-ink bg-surface">
                <div
                  className="h-full bg-yellow transition-[width] duration-200 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] How it works</h2>
          <ul className="mt-4 space-y-3">
            {[
              "Each page renders in your tab and Tesseract reads the words with their positions.",
              "A copy of the PDF gets an invisible text layer — same spot, same size, opacity zero.",
              "Ctrl-F, copy-paste and screen readers now work on the scan, exactly like a native PDF.",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-ink font-mono text-[10px] font-bold text-surface">
                  {i + 1}
                </span>
                <span className="font-mono text-[11px] font-semibold leading-relaxed text-ink/80">{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex-1 rounded-md border-2 border-dashed border-ink/30 p-4">
            <FileDown className="mx-auto h-6 w-6 text-ink/30" aria-hidden="true" />
            <p className="mt-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              The searchable PDF downloads the moment OCR finishes — no account, no quota
            </p>
          </div>
          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Fonts beyond Latin-1 are filtered to stay WinAnsi-safe — Cyrillic/CJK scans are best OCR'd with
            the right language and copied out as text instead.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}