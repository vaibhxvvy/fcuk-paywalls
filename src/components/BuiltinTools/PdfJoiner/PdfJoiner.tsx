import { useState } from "react";
import { Download, Paperclip, Upload, X } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface PdfFile {
  id: number;
  name: string;
  size: number;
  pages: number;
  data: ArrayBuffer;
}

let nextId = 1;

export function PdfJoiner() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const addFiles = async (list: FileList | File[]) => {
    setError(null);
    setDone(null);
    const { PDFDocument } = await import("pdf-lib");
    for (const f of Array.from(list)) {
      if (f.type !== "application/pdf") {
        setError(`SKIPPED ${f.name} — NOT A PDF`);
        continue;
      }
      try {
        const buf = await f.arrayBuffer();
        const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
        setFiles((prev) => [
          ...prev,
          { id: nextId++, name: f.name, size: f.size, pages: doc.getPageCount(), data: buf },
        ]);
      } catch {
        setError(`SKIPPED ${f.name} — COULD NOT READ`);
      }
    }
  };

  const move = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = (id: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setDone(null);
  };

  const join = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      let totalPages = 0;
      for (const f of files) {
        const src = await PDFDocument.load(f.data, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
        totalPages += pages.length;
      }
      const bytes = await out.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `fcuk-joined-${files.length}-pdfs.pdf`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      setDone(`[ OK ] ${files.length} PDFs, ${totalPages} PAGES, ${(blob.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      setError(`JOIN FAILED — ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      crumb="PDF-JOINER"
      title="The binder."
      tagline="Stack PDFs, stitch them into one. Reorder, drop, join — all in your browser, nothing uploaded."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The stack
          </h2>

          <div className="mt-4 rounded-lg border-[3px] border-dashed border-ink bg-surface p-5 text-center">
            <Paperclip className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
            <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              Drop PDFs here — or pick them
            </p>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              id="pdf-picker"
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button size="sm" className="mt-4 uppercase" onClick={() => document.getElementById("pdf-picker")?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Pick PDFs
            </Button>
            <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              Files never leave your machine
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  {files.length} PDF{files.length > 1 ? "s" : ""} — order below is the bind order
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setDone(null); }} className="uppercase">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Clear all
                </Button>
              </div>
              <ul className="mt-2 space-y-2">
                {files.map((f, i) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-ink font-mono text-[11px] font-bold text-surface">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold text-ink">{f.name}</span>
                      <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
                        {(f.size / 1024).toFixed(0)} KB · {f.pages} pages
                      </span>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded-md border-2 border-ink px-2 py-1 font-mono text-xs font-bold uppercase text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === files.length - 1}
                        className="rounded-md border-2 border-ink px-2 py-1 font-mono text-xs font-bold uppercase text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(f.id)}
                        className="rounded-md border-2 border-ink px-2 py-1 font-mono text-xs font-bold uppercase text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-red"
                        aria-label={`Remove ${f.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The binder</h2>

          {files.length > 0 ? (
            <>
              <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Copies are bound in the listed order — originals stay untouched
              </p>
              <Button size="sm" onClick={() => void join()} disabled={busy} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                {busy ? "Binding…" : `Join ${files.length} PDF${files.length > 1 ? "s" : ""}`}
              </Button>
              {done && (
                <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
                  {done}
                </p>
              )}
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The bound file lands here
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            pdf-lib runs in the tab — your documents never touch a server.
          </p>
        </section>
      </div>

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}
    </ToolShell>
  );
}