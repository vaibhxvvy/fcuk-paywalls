import { useState } from "react";
import { FileCode2, Copy, ArrowRight } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

export function DataUriGenerator() {
  const [uri, setUri] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; size: number; type: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — keep it under 2 MB for a sane data URI.`);
      setUri(null);
      setMeta(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUri(String(reader.result));
      setMeta({ name: file.name, size: file.size, type: file.type || "unknown" });
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  const copy = async () => {
    if (!uri) return;
    await navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const uriSize = uri ? new Blob([uri]).size : 0;
  const overheadPct = uri && meta ? ((uriSize - meta.size) / meta.size) * 100 : 0;

  return (
    <ToolShell
      crumb="DATA-URI"
      title="The embedder."
      tagline="Turn any small file into a data: URI you can paste straight into HTML, CSS or URLs."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source file
            <FileCode2 className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            type="file"
            className="mt-4 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5 font-mono text-xs text-ink file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-yellow file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-bold file:uppercase file:text-ink hover:file:bg-yellow/80"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            Best for small assets — images, icons, fonts, tiny scripts. Max 2 MB.
          </p>

          {meta && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">{meta.name}</p>
              <p className="mt-1 font-mono text-sm font-bold text-ink">
                {(meta.size / 1024).toFixed(1)} KB → {(uriSize / 1024).toFixed(1)} KB
                <span className="ml-2 font-mono text-[10px] font-semibold text-ink/50">
                  (+{overheadPct.toFixed(0)}% base64 overhead)
                </span>
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              {error}
            </p>
          )}

          {meta && (
            <div className="mt-4">
              <img
                src={uri ?? ""}
                alt="Preview"
                className="max-h-40 rounded-md border-2 border-ink bg-[repeating-conic-gradient(#e8e1d5_0%_25%,#ffffff_0%_50%)] bg-[length:24px_24px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The URI</h2>
          <textarea
            readOnly
            value={uri ?? ""}
            placeholder="data:… lands here"
            spellCheck={false}
            className="mt-4 h-80 w-full resize-none rounded-md border-2 border-ink bg-ink p-3 font-mono text-[11px] leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!uri} className="uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <a
              href={uri ?? undefined}
              download={meta?.name ?? "data-uri"}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border-2 border-ink bg-yellow px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm transition-[background-color,shadow,transform] duration-200 ease-brutal hover:translate-y-0.5 hover:shadow-none",
                !uri && "pointer-events-none opacity-30",
              )}
            >
              Try it <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] Usage</h2>
        <div className="mt-4 space-y-3">
          {[
            ["<img src>", `<img src="${(uri ?? "data:image/png;base64,…").slice(0, 48)}…" alt="…" />`],
            ["CSS url()", `background: url(${(uri ?? "data:image/svg+xml,…").slice(0, 48)}…);`],
            ["<a href>", `<a href="${(uri ?? "data:…").slice(0, 48)}…" download>grab it</a>`],
          ].map(([label, code]) => (
            <div key={label} className="rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">{label}</p>
              <p className="mt-0.5 truncate font-mono text-xs font-semibold text-ink/80">{code}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Encoded with FileReader in your tab — the bytes never leave.
      </p>
    </ToolShell>
  );
}