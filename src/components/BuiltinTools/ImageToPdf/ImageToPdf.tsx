import { useState } from "react";
import { Download, Images, Upload, X } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface ImageEntry {
  id: number;
  name: string;
  data: Uint8Array;
  w: number;
  h: number;
  isPng: boolean;
}

let nextId = 1;

function loadImage(file: File): Promise<{ data: Uint8Array; w: number; h: number; isPng: boolean }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const isPng = file.type === "image/png";
      if (file.type === "image/jpeg" || isPng) {
        file.arrayBuffer().then((buf) =>
          resolve({
            data: new Uint8Array(buf),
            w: img.naturalWidth,
            h: img.naturalHeight,
            isPng,
          }),
        );
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("no canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("no blob"));
            return;
          }
          blob.arrayBuffer().then((buf) =>
            resolve({
              data: new Uint8Array(buf),
              w: img.naturalWidth,
              h: img.naturalHeight,
              isPng: true,
            }),
          );
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

export function ImageToPdf() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const addFiles = async (list: FileList | File[]) => {
    setError(null);
    setDone(null);
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) {
        setError(`SKIPPED ${f.name} — NOT AN IMAGE`);
        continue;
      }
      try {
        const img = await loadImage(f);
        setImages((prev) => [...prev, { id: nextId++, name: f.name, ...img }]);
      } catch {
        setError(`SKIPPED ${f.name} — COULD NOT READ`);
      }
    }
  };

  const remove = (id: number) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    setDone(null);
  };

  const makePdf = async () => {
    if (images.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      for (const img of images) {
        const embedded = img.isPng
          ? await pdf.embedPng(img.data)
          : await pdf.embedJpg(img.data);
        const page = pdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0 });
      }
      const bytes = await pdf.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
      const a = document.createElement("a");
      a.download = "fcuk-images.pdf";
      a.href = URL.createObjectURL(blob);
      a.click();
      setDone(`[ OK ] ${images.length} IMAGE${images.length > 1 ? "S" : ""} → PDF (${(blob.size / 1024).toFixed(0)} KB)`);
    } catch (e) {
      setError(`PDF FAILED — ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      crumb="IMAGE-TO-PDF"
      title="The binder."
      tagline="Stack images, get back a PDF. JPG and PNG embed natively; anything else is converted first. All in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The stack
          </h2>

          <div className="mt-4 rounded-lg border-[3px] border-dashed border-ink bg-surface p-5 text-center">
            <Images className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
            <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              Drop images here — one page each
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="img-pdf-picker"
              onChange={(e) => {
                if (e.target.files?.length) void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button size="sm" className="mt-4 uppercase" onClick={() => document.getElementById("img-pdf-picker")?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Pick images
            </Button>
            <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              Nothing uploads — pages are built right here
            </p>
          </div>

          {images.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  {images.length} image{images.length > 1 ? "s" : ""} — one page each, in this order
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setImages([]); setDone(null); }} className="uppercase">
                  <X className="h-4 w-4" aria-hidden="true" />
                  Clear all
                </Button>
              </div>
              <ul className="mt-2 space-y-2">
                {images.map((img, i) => (
                  <li key={img.id} className="flex items-center gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-ink font-mono text-[11px] font-bold text-surface">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-bold text-ink">{img.name}</span>
                      <span className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
                        {img.w}×{img.h}px · {img.isPng ? "PNG" : "JPEG"} · {(img.data.byteLength / 1024).toFixed(0)} KB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(img.id)}
                      className="rounded-md border-2 border-ink px-2 py-1 font-mono text-xs font-bold uppercase text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-red"
                      aria-label={`Remove ${img.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Pages out</h2>

          {images.length > 0 ? (
            <>
              <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                JPG and PNG embed natively; anything else gets converted first
              </p>
              <Button size="sm" onClick={() => void makePdf()} disabled={busy} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                {busy ? "Binding…" : `Make PDF (${images.length} page${images.length > 1 ? "s" : ""})`}
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
                The PDF lands here — no upload, no account
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Reuses the same pdf-lib that the PDF joiner loads — still lazy-loaded, still in your tab.
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