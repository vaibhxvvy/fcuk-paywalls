import { useState } from "react";
import { FileUp, QrCode } from "lucide-react";
import qrcode from "qrcode-generator";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const LEVELS = ["L", "M", "Q", "H"] as const;

function qrPng(value: string, px: number, level: (typeof LEVELS)[number], border: number): Uint8Array | null {
  const q = qrcode(0, level);
  q.addData(value);
  q.make();
  const n = q.getModuleCount();
  const cell = Math.max(1, Math.floor(px / (n + border * 2)));
  const canvas = document.createElement("canvas");
  canvas.width = (n + border * 2) * cell;
  canvas.height = (n + border * 2) * cell;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) ctx.fillRect((c + border) * cell, (r + border) * cell, cell, cell);
    }
  }
  const dataUrl = canvas.toDataURL("image/png");
  const bin = atob(dataUrl.split(",")[1]);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function QrBatch() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(512);
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("M");
  const [border, setBorder] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const values = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const run = async () => {
    if (values.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { zipSync } = await import("fflate");
      const files: Record<string, Uint8Array> = {};
      const pad = String(values.length).length;
      let failed = 0;
      values.forEach((v, i) => {
        const png = qrPng(v, size, level, border);
        if (!png) {
          failed += 1;
          return;
        }
        const safe = v.replace(/[^\w.-]+/g, "_").slice(0, 60) || `qr-${i + 1}`;
        files[`${safe}-${String(i + 1).padStart(pad, "0")}.png`] = png;
      });
      if (Object.keys(files).length === 0) throw new Error("Nothing to encode.");
      const zipped = zipSync(files);
      const blob = new Blob([zipped], { type: "application/zip" });
      const a = document.createElement("a");
      a.download = `fcuk-qr-batch-${values.length}.zip`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(
        `[ OK ] ${Object.keys(files).length} QR${Object.keys(files).length > 1 ? "S" : ""} IN ONE ZIP — ${(blob.size / 1024).toFixed(0)} KB${
          failed > 0 ? `, ${failed} SKIPPED` : ""
        }`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Batch failed.");
    } finally {
      setBusy(false);
    }
  };

  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <label className="mt-3 block">
      <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
        {label}
        <span className="text-ink">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-yellow"
      />
    </label>
  );

  return (
    <ToolShell
      crumb="QR-BATCH"
      title="The wallpaper."
      tagline="Paste hundreds of links, get hundreds of QR codes in one ZIP. QRExplore caps free batches at 100 codes and sells credits past it; a QR code is a 21×21 matrix of squares."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The values</h2>
          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              One value per line — URLs, Wi-Fi strings, plain text, anything
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={"https://example.com\nhttps://another.link\nWIFI:S:net;T:WPA;P:pass;;"}
              className="mt-2 w-full resize-y rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          </label>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
            {values.length} value{values.length === 1 ? "" : "s"} ready
          </p>

          <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Error correction — higher survives damage, grows the pattern
            </span>
            <div className="mt-1.5 flex gap-1.5">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`flex-1 rounded-md border-2 border-ink px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal ${
                    level === l ? "bg-yellow" : "bg-surface hover:bg-yellow/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {slider("Pixel size (PNG)", size, 200, 1200, 50, setSize)}
          {slider("Quiet zone (modules)", border, 0, 8, 1, setBorder)}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The batch</h2>

          <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
            <div className="text-center">
              <QrCode className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                {values.length > 0
                  ? `${values.length} codes will land here as one ZIP`
                  : "Paste values on the left — the ZIP lands here"}
              </p>
            </div>
          </div>

          <Button onClick={() => void run()} disabled={busy || values.length === 0} className="mt-4 w-full uppercase">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            {busy ? "Encoding…" : `Generate ${values.length || ""} QR${values.length === 1 ? "" : "s"} → ZIP`}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Every code renders locally — even a thousand links never touch a server. Filenames come from the
            value, so your print shop stays sane.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}