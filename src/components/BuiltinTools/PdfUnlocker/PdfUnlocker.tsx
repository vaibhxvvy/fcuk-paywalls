import { useRef, useState } from "react";
import { FileDown, Lock, LockOpen } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

export function PdfUnlocker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [out, setOut] = useState<string | null>(null);
  const [outName, setOutName] = useState("");
  const [mode, setMode] = useState<"clean" | "raster" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlock = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setError(null);
    setOut(null);
    setMode(null);
    setName(file.name);
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;
      const buf = await file.arrayBuffer();

      const task = getDocument({
        data: new Uint8Array(buf),
        password: password || undefined,
      });
      const doc = await task.promise;

      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      const encrypted = src.isEncrypted;

      if (!encrypted) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        setOut(URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" })));
        setMode("clean");
      } else {
        const out = await PDFDocument.create();
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable.");
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          const png = await out.embedPng(canvas.toDataURL("image/png"));
          const pg = out.addPage([viewport.width, viewport.height]);
          pg.drawImage(png, { x: 0, y: 0, width: viewport.width, height: viewport.height });
          setProgress(Math.round((i / doc.numPages) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
        const bytes = await out.save();
        setOut(URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" })));
        setMode("raster");
      }
      setOutName(file.name.replace(/\.pdf$/i, "") + "-unlocked.pdf");
      setBusy(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not open that PDF.";
      setError(
        /password/i.test(msg)
          ? "This PDF is encrypted with a user password — enter the password above, or it genuinely cannot be opened. No site can bypass real encryption either."
          : msg,
      );
      setBusy(false);
    }
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out;
    a.download = outName;
    a.click();
  };

  return (
    <ToolShell
      crumb="PDF-UNLOCKER"
      title="The jailbreak."
      tagline="Strip print, copy and edit locks off a PDF — locally. SmallPDF gives you 2 unlock tasks a day before Pro at $12 a month; iLovePDF throttles free users to one an hour. Locks are just flags."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Locked file
            <Lock className="h-4 w-4" aria-hidden="true" />
          </h2>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              User password — only if the file asks for one
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for print/copy-locked PDFs"
              className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          </label>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockOpen className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? name : "Pick a locked PDF"}
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void unlock(f);
              e.target.value = "";
            }}
          />

          {busy && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">Unlocking…</span>
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
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Unlocked out</h2>

          {out ? (
            <>
              {mode === "raster" && (
                <p className="mt-4 rounded-md border-2 border-ink bg-yellow/30 px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                  NOTE: this file was truly encrypted, so the unlocked copy is rendered page-by-page — text is part
                  of the image now. The print/copy locks are gone either way.
                </p>
              )}
              <object data={out} type="application/pdf" className="mt-4 h-96 w-full rounded-md border-2 border-ink bg-surface-muted" />
              <Button onClick={download} className="mt-4 w-full uppercase">
                <FileDown className="h-4 w-4" aria-hidden="true" />
                Download unlocked PDF
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The unlocked file appears here — no upload, no task counter
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            If the file opens without a password, the locks were permission flags — they drop instantly and the text
            stays selectable. Truly encrypted files need their user password, from anyone, anywhere.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The unlock sites count your 2 free tasks and sell the third; the flags are yours to clear.
      </p>
    </ToolShell>
  );
}