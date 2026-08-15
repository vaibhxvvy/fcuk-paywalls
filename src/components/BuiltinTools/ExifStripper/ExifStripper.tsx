import { useState } from "react";
import { Download, ShieldCheck, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface StripResult {
  inputSize: number;
  outputSize: number;
  removed: string[];
  kept: string[];
  fileName: string;
  bytes: Uint8Array;
}

const PNG_METADATA_CHUNKS = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME", "dSIG", "CgBI"]);
const PNG_KEEP = new Set(["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "pHYs", "sRGB", "gAMA", "cHRM", "bKGD"]);

function stripPng(bytes: Uint8Array): StripResult {
  if (bytes.length < 8 || bytes[0] !== 0x89) throw new Error("NOT A PNG");
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const removed: string[] = [];
  const kept: string[] = [];
  let off = 8;
  while (off < bytes.length) {
    const len = dv.getUint32(off);
    const type = String.fromCharCode(bytes[off + 4], bytes[off + 5], bytes[off + 6], bytes[off + 7]);
    const total = len + 12;
    if (type === "IEND") {
      for (let i = off; i < bytes.length; i++) out.push(bytes[i]);
      break;
    }
    if (PNG_METADATA_CHUNKS.has(type)) {
      removed.push(`${type} (${len} B)`);
    } else if (PNG_KEEP.has(type)) {
      for (let i = off; i < off + total; i++) out.push(bytes[i]);
      kept.push(type);
    } else {
      removed.push(`${type} (${len} B)`);
    }
    off += total;
  }
  if (removed.length === 0) {
    return {
      inputSize: bytes.length,
      outputSize: bytes.length,
      removed: [],
      kept,
      fileName: "png",
      bytes: bytes,
    };
  }
  return {
    inputSize: bytes.length,
    outputSize: out.length,
    removed,
    kept,
    fileName: "png",
    bytes: new Uint8Array(out),
  };
}

function stripJpeg(bytes: Uint8Array): StripResult {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("NOT A JPEG");
  const out: number[] = [0xff, 0xd8];
  const removed: string[] = [];
  const kept: string[] = [];
  let off = 2;
  while (off < bytes.length) {
    if (bytes[off] !== 0xff) {
      off++;
      continue;
    }
    const marker = bytes[off + 1];
    if (marker === 0xd9) {
      out.push(0xff, 0xd9);
      break;
    }
    if (marker === 0xda) {
      for (let i = off; i < bytes.length; i++) out.push(bytes[i]);
      break;
    }
    const len = (bytes[off + 2] << 8) | bytes[off + 3];
    const segLen = len + 2;
    if (marker >= 0xe0 && marker <= 0xef) {
      if (marker === 0xe0) {
        out.push(0xff, 0xe0);
        for (let i = off + 2; i < off + segLen; i++) out.push(bytes[i]);
        kept.push("APP0 (JFIF)");
      } else {
        removed.push(`APP${marker - 0xe0} (${len} B)`);
      }
    } else {
      for (let i = off; i < off + segLen; i++) out.push(bytes[i]);
      kept.push(`0x${marker.toString(16)}`);
    }
    off += segLen;
  }
  return {
    inputSize: bytes.length,
    outputSize: out.length,
    removed,
    kept,
    fileName: "jpg",
    bytes: new Uint8Array(out),
  };
}

export function ExifStripper() {
  const [result, setResult] = useState<StripResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (f: File) => {
    setError(null);
    setResult(null);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const r =
        f.type === "image/png" || (buf[0] === 0x89 && buf[1] === 0x50)
          ? stripPng(buf)
          : f.type === "image/jpeg" || (buf[0] === 0xff && buf[1] === 0xd8)
            ? stripJpeg(buf)
            : null;
      if (!r) {
        setError("SUPPORTED: JPEG AND PNG ONLY");
        return;
      }
      setResult({ ...r, fileName: f.name });
    } catch (e) {
      setError(`STRIP FAILED — ${(e as Error).message}`);
    }
  };

  const download = () => {
    if (!result) return;
    const base = result.fileName.replace(/\.[^.]+$/, "");
    const blob = new Blob([result.bytes as unknown as BlobPart], { type: `image/${result.fileName.split(".").pop() === "png" ? "png" : "jpeg"}` });
    const a = document.createElement("a");
    a.download = `${base}-stripped.${result.fileName.split(".").pop()}`;
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  return (
    <ToolShell
      crumb="EXIF-STRIPPER"
      title="The shredder."
      tagline="Scrub GPS, camera, dates and hidden metadata from your photos. Byte-level surgery in your tab."
    >
      <div className="mt-10 rounded-lg border-[3px] border-dashed border-ink bg-surface p-5 text-center shadow-brutal-md">
        <ShieldCheck className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
        <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          Drop JPEG or PNG photos here
        </p>
        <label className="mt-4 inline-block cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-md border-2 border-ink bg-yellow px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm transition-[background-color,box-shadow] duration-200 ease-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Pick photos
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => {
              const fs = e.target.files;
              if (fs?.length) void pick(fs[0]);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
          Re-encoding is not required — chunks are removed byte-for-byte, pixels untouched
        </p>
      </div>

      {result && (
        <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] {result.fileName}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border-2 border-ink bg-surface-muted p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Before</p>
              <p className="mt-1 font-mono text-sm font-bold text-ink">{(result.inputSize / 1024).toFixed(1)} KB</p>
            </div>
            <div className="rounded-md border-2 border-ink bg-surface-muted p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">After</p>
              <p className="mt-1 font-mono text-sm font-bold text-green">
                {(result.outputSize / 1024).toFixed(1)} KB
                <span className="ml-2 text-xs text-ink/50">
                  -{Math.max(0, Math.round((1 - result.outputSize / result.inputSize) * 100))}%
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border-2 border-ink bg-surface-muted p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red">
                Shredded ({result.removed.length})
              </p>
              <ul className="mt-2 space-y-1">
                {result.removed.length === 0 && (
                  <li className="font-mono text-[11px] text-ink/50">Nothing to shred — already clean</li>
                )}
                {result.removed.map((r, i) => (
                  <li key={i} className="font-mono text-[11px] text-ink">
                    ✕ {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border-2 border-ink bg-surface-muted p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green">
                Kept ({result.kept.length})
              </p>
              <ul className="mt-2 space-y-1">
                {result.kept.map((k, i) => (
                  <li key={i} className="font-mono text-[11px] text-ink">
                    ✓ {k}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Button size="sm" onClick={download} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download stripped
          </Button>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
            [ OK ] PIXELS UNTOUCHED — CHUNKS REMOVED, CRC STILL VALID
          </p>
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        JPEG APP segments and PNG text chunks are surgically removed in your tab — originals never leave.
      </p>
    </ToolShell>
  );
}