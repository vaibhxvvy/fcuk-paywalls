import { useRef, useState } from "react";
import { Copy, FileDown, FileScan, ScanText } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const LANGS = [
  { code: "eng", label: "English" },
  { code: "spa", label: "Spanish" },
  { code: "fra", label: "French" },
  { code: "deu", label: "German" },
  { code: "ita", label: "Italian" },
  { code: "por", label: "Portuguese" },
  { code: "hin", label: "Hindi" },
  { code: "ara", label: "Arabic" },
] as const;

export function OcrForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [lang, setLang] = useState<(typeof LANGS)[number]["code"]>("eng");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setError(null);
    setText("");
    setName(file.name);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
          setStatus(m.status);
        },
      });
      try {
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        let out = "";
        if (isPdf) {
          const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
          const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
          GlobalWorkerOptions.workerSrc = workerUrl;
          const doc = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
          const pages: string[] = [];
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
            pages.push(data.text.trim());
            setProgress(Math.round((i / doc.numPages) * 100));
            await new Promise((r) => setTimeout(r, 0));
          }
          out = pages.join("\n\n");
        } else {
          const { data } = await worker.recognize(file);
          out = data.text;
        }
        setText(out.trim() || "(no text found — try another language or a clearer scan)");
      } finally {
        await worker.terminate();
      }
      setStatus(null);
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed — the language data may need a network fetch on first run.");
      setBusy(false);
      setStatus(null);
    }
  };

  const download = (ext: "txt" | "md") => {
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(name || "ocr").replace(/\.[^.]+$/, "")}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="OCR-FORGE"
      title="The reader."
      tagline="Scan text out of any image or scanned PDF — Tesseract runs in this tab. Adobe gives you two free OCR tasks before the signup wall and hides the rest behind Pro at $19.99 a month."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <FileScan className="h-4 w-4" aria-hidden="true" />
          </h2>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Language</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as (typeof LANGS)[number]["code"])}
              className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanText className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? name : "Pick an image or scanned PDF"}
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              JPG · PNG · WebP · PDF — every page gets read
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(f);
              e.target.value = "";
            }}
          />

          {busy && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">Reading…</span>
                <span className="font-mono text-xs font-bold text-ink/60">{progress}%</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-sm border-2 border-ink bg-surface">
                <div
                  className="h-full bg-yellow transition-[width] duration-200 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {status ?? "working"} — the first run downloads the language model once
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Text out</h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={busy}
            placeholder="Recognized text lands here — editable, copyable, downloadable."
            className="mt-4 h-80 flex-1 w-full resize-y rounded-md border-2 border-ink bg-paper p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => download("txt")} disabled={!text} className="uppercase">
              <FileDown className="h-4 w-4" aria-hidden="true" />
              .txt
            </Button>
            <Button onClick={() => download("md")} disabled={!text} className="uppercase">
              <FileDown className="h-4 w-4" aria-hidden="true" />
              .md
            </Button>
            <Button variant="secondary" onClick={() => void copy()} disabled={!text} className="ml-auto uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
            {text ? `[ OK ] ${text.split(/\s+/).filter(Boolean).length} WORDS` : "[ IDLE ] PICK A FILE"}
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        OCR runs in-browser via Tesseract WASM; the engine never sees your document — only the one-time language model download touches the network.
      </p>
    </ToolShell>
  );
}