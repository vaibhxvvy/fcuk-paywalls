import { useRef, useState } from "react";
import { Download, FileImage, Images } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface Job {
  id: number;
  name: string;
  size: number;
  file: Blob;
  state: "queued" | "working" | "done" | "error";
  outBlob: Blob | null;
  outName: string;
  error?: string;
}

const fmtSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};

const extFor = (t: string) => (t === "image/jpeg" ? ".jpg" : t === "image/png" ? ".png" : ".webp");

let nextId = 1;

export function HeicForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [toType, setToType] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const fresh: Job[] = Array.from(files).map((f) => ({
      id: nextId++,
      name: f.name,
      size: f.size,
      file: f,
      state: "queued",
      outBlob: null,
      outName: f.name.replace(/\.[^.]+$/, "") + extFor(toType),
    }));
    setJobs((prev) => [...prev, ...fresh]);
  };

  const runOne = async (id: number) => {
    setBusy(true);
    setError(null);
    const job = jobs.find((j) => j.id === id);
    if (!job) return;
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, state: "working" } : j)));
    try {
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({
        blob: job.file,
        toType,
        quality,
      });
      const outBlob = Array.isArray(out) ? out[0] : out;
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, state: "done", outBlob, outName: j.name.replace(/\.[^.]+$/, "") + extFor(toType) }
            : j,
        ),
      );
    } catch (e) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, state: "error", error: e instanceof Error ? e.message : "Conversion failed." }
            : j,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const runPending = () => {
    const pending = jobs.filter((j) => j.state !== "done");
    void pending.map((j) => runOne(j.id));
  };

  const remove = (id: number) => setJobs((prev) => prev.filter((j) => j.id !== id));

  const download = (job: Job) => {
    if (!job.outBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(job.outBlob);
    a.download = job.outName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAll = () => {
    jobs.filter((j) => j.state === "done").forEach((j) => download(j));
  };

  const doneCount = jobs.filter((j) => j.state === "done").length;

  return (
    <ToolShell
      crumb="HEIC-FORGE"
      title="The decoder."
      tagline="Turn iPhone photos into JPG, PNG or WebP — in batches, with quality control. heic.now lets you convert 20 a day before Premium at $9.99 a month; the decode math is free."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Batch
            <Images className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Output</span>
              <select
                value={toType}
                onChange={(e) => setToType(e.target.value as typeof toType)}
                className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
              >
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Quality — {Math.round(quality * 100)}%
              </span>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-4 w-full accent-ink"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <FileImage className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              Pick HEIC / HEIF photos
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              Multiple at once — decoded locally by WASM
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".heic,.heif,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files);
              e.target.value = "";
            }}
          />

          {jobs.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold text-ink">{job.name}</span>
                  <span className="shrink-0 font-mono text-[10px] font-bold text-ink/50">{fmtSize(job.size)}</span>
                  {job.state === "done" ? (
                    <span className="shrink-0 font-mono text-[10px] font-bold text-green">
                      {fmtSize(job.outBlob?.size ?? 0)}
                    </span>
                  ) : job.state === "error" ? (
                    <span className="shrink-0 font-mono text-[10px] font-bold text-red" title={job.error}>
                      FAILED
                    </span>
                  ) : (
                    <span className="shrink-0 font-mono text-[10px] font-bold text-ink/40">{job.state}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(job.id)}
                    aria-label={`Remove ${job.name}`}
                    className="shrink-0 rounded-md border-2 border-ink px-1 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-red"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => void runOne(jobs.find((j) => j.state !== "done")?.id ?? jobs[0]?.id)}
              disabled={!jobs.length || busy}
              className="uppercase"
            >
              Convert next
            </Button>
            <Button
              variant="secondary"
              onClick={runPending}
              disabled={!jobs.some((j) => j.state !== "done") || busy}
              className="uppercase"
            >
              Convert all pending
            </Button>
          </div>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Results</h2>
          {doneCount === 0 ? (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Converted photos appear here with their new size
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {jobs
                  .filter((j) => j.state === "done")
                  .map((job) => (
                    <div key={job.id} className="rounded-md border-2 border-ink bg-surface-muted p-2">
                      {job.outBlob && (
                        <img
                          src={URL.createObjectURL(job.outBlob)}
                          alt={job.outName}
                          className="h-24 w-full rounded-sm border-2 border-ink object-cover"
                        />
                      )}
                      <p className="mt-2 truncate font-mono text-[10px] font-bold text-ink">{job.outName}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-mono text-[9px] font-bold text-ink/50">
                          {fmtSize(job.size)} → {fmtSize(job.outBlob?.size ?? 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => download(job)}
                          aria-label={`Download ${job.outName}`}
                          className="rounded-md border-2 border-ink bg-yellow px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink transition-transform duration-200 ease-brutal hover:scale-105"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              <Button onClick={downloadAll} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download all ({doneCount})
              </Button>
            </>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Decoding runs on-device via heic2any WASM — photos never leave this tab.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The HEIC sites meter conversions and sell priority queues; decoding is math your browser already owns.
      </p>
    </ToolShell>
  );
}