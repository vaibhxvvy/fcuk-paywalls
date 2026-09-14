import { useRef, useState } from "react";
import { FileDown, Music, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

type Format = "wav" | "mp3" | "ogg" | "m4a" | "flac";

const FORMATS: { id: Format; label: string; note: string }[] = [
  { id: "wav", label: "WAV", note: "lossless · instant, no download" },
  { id: "mp3", label: "MP3", note: "small · needs ~30MB engine once" },
  { id: "ogg", label: "OGG", note: "open · vorbis, needs engine" },
  { id: "m4a", label: "M4A", note: "apple-friendly AAC, needs engine" },
  { id: "flac", label: "FLAC", note: "lossless squeeze, needs engine" },
];

const BITRATES = ["128k", "192k", "256k", "320k"];
const SAMPLE_RATES = ["keep", "44100", "48000"] as const;

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

function encodeWav(buf: AudioBuffer): Blob {
  const numCh = buf.numberOfChannels;
  const len = buf.length;
  const sr = buf.sampleRate;
  const bytes = len * numCh * 2;
  const ab = new ArrayBuffer(44 + bytes);
  const dv = new DataView(ab);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  dv.setUint32(4, 36 + bytes, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * numCh * 2, true);
  dv.setUint16(32, numCh * 2, true);
  dv.setUint16(34, 16, true);
  ws(36, "data");
  dv.setUint32(40, bytes, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buf.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function sliceBuffer(src: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const s0 = Math.max(0, Math.floor(startSec * src.sampleRate));
  const s1 = Math.min(src.length, Math.ceil(endSec * src.sampleRate));
  const len = Math.max(1, s1 - s0);
  const out = new AudioBuffer({ length: len, numberOfChannels: src.numberOfChannels, sampleRate: src.sampleRate });
  for (let c = 0; c < src.numberOfChannels; c++) {
    out.copyToChannel(src.getChannelData(c).subarray(s0, s1), c);
  }
  return out;
}

async function resampleBuffer(src: AudioBuffer, targetSr: number): Promise<AudioBuffer> {
  if (src.sampleRate === targetSr) return src;
  const dur = src.duration;
  const ctx = new OfflineAudioContext(src.numberOfChannels, Math.ceil(dur * targetSr), targetSr);
  const node = ctx.createBufferSource();
  node.buffer = src;
  node.connect(ctx.destination);
  node.start(0);
  return ctx.startRendering();
}

interface FfmpegInstance {
  writeFile: (n: string, d: Uint8Array) => Promise<unknown>;
  exec: (args: string[]) => Promise<number>;
  readFile: (n: string) => Promise<Uint8Array | string>;
  deleteFile: (n: string) => Promise<unknown>;
}

let ffmpegInstance: FfmpegInstance | null = null;

async function getFfmpeg(onProgress: (p: number) => void): Promise<{
  ff: FfmpegInstance;
  fetchFile: (f: Blob) => Promise<Uint8Array>;
}> {
  const { fetchFile, toBlobURL } = (await import("@ffmpeg/util")) as {
    fetchFile: (f: Blob) => Promise<Uint8Array>;
    toBlobURL: (url: string, type: string) => Promise<string>;
  };
  if (ffmpegInstance) return { ff: ffmpegInstance, fetchFile };
  const { FFmpeg } = (await import("@ffmpeg/ffmpeg")) as unknown as {
    FFmpeg: new () => {
      load: (o: Record<string, string>) => Promise<unknown>;
      on: (ev: string, cb: (e: { progress: number }) => void) => void;
      writeFile: FfmpegInstance["writeFile"];
      exec: FfmpegInstance["exec"];
      readFile: FfmpegInstance["readFile"];
      deleteFile: FfmpegInstance["deleteFile"];
    };
  };
  const ff = new FFmpeg();
  ff.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(1, progress))));
  // pinned single-thread core — no SharedArrayBuffer / COOP-COEP needed
  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
  });
  ffmpegInstance = ff;
  return { ff, fetchFile };
}

const MIME: Record<Format, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
};

export function MediaConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [audio, setAudio] = useState<AudioBuffer | null>(null);
  const [url, setUrl] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [format, setFormat] = useState<Format>("mp3");
  const [bitrate, setBitrate] = useState("192k");
  const [sampleRate, setSampleRate] = useState<(typeof SAMPLE_RATES)[number]>("keep");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const duration = audio?.duration ?? 0;

  const onFile = async (f: File) => {
    setError(null);
    setDone(null);
    setAudio(null);
    if (url) URL.revokeObjectURL(url);
    if (f.size > 500 * 1024 * 1024) {
      setError("That file is over 500MB — browsers usually OOM past this. Trim it smaller first.");
      return;
    }
    setFileName(f.name);
    setPhase("Decoding…");
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const actx = new AC();
      const decoded = await actx.decodeAudioData(buf.slice(0));
      await actx.close().catch(() => undefined);
      setAudio(decoded);
      setStart(0);
      setEnd(decoded.duration);
      setUrl(URL.createObjectURL(f));
      setPhase("");
    } catch {
      setError("Could not decode that file — try an MP4/WEBM/MP3/WAV export (DRM-protected files won't decode).");
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    if (!audio || busy) return;
    if (end - start < 0.1) {
      setError("Pick a range longer than a blink.");
      return;
    }
    setError(null);
    setDone(null);
    setBusy(true);
    setProgress(0);
    try {
      setPhase("Trimming…");
      let part = sliceBuffer(audio, start, end);
      const targetSr = sampleRate === "keep" ? part.sampleRate : Number(sampleRate);
      if (targetSr !== part.sampleRate) {
        setPhase(`Resampling to ${targetSr} Hz…`);
        part = await resampleBuffer(part, targetSr);
      }
      const base = fileName.replace(/\.[^.]+$/, "") || "audio";
      const stamp = `${fmt(start).replace(":", "m")}s-${fmt(end).replace(":", "m")}s`;

      if (format === "wav") {
        const blob = encodeWav(part);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${base}-${stamp}.wav`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
        setDone(`[ OK ] WAV · ${(blob.size / 1024).toFixed(0)} KB · ${fmt(part.duration)} long`);
        return;
      }

      setPhase("Loading converter engine (~30MB, first time only)…");
      const { ff, fetchFile } = await getFfmpeg(setProgress);
      setPhase(`Encoding ${format.toUpperCase()}…`);
      const wavBlob = encodeWav(part);
      await ff.writeFile("in.wav", await fetchFile(wavBlob));
      const outName = `out.${format}`;
      const args =
        format === "flac"
          ? ["-i", "in.wav", "-ar", String(targetSr), outName]
          : ["-i", "in.wav", "-b:a", bitrate, "-ar", String(targetSr), outName];
      const code = await ff.exec(args);
      if (code !== 0) throw new Error(`Encoder exited with code ${code}`);
      const data = (await ff.readFile(outName)) as Uint8Array;
      const bytes = new Uint8Array(data);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: MIME[format] });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}-${stamp}.${format}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      await ff.deleteFile("in.wav").catch(() => undefined);
      await ff.deleteFile(outName).catch(() => undefined);
      setDone(`[ OK ] ${format.toUpperCase()} · ${(blob.size / 1024).toFixed(0)} KB · ${bitrate}${format === "flac" ? " lossless" : ""}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Convert failed.";
      setError(
        /load|fetch|network|cdn/i.test(msg)
          ? "Engine download failed — check connection/ad-blocker and retry. WAV export always works offline."
          : msg,
      );
    } finally {
      setBusy(false);
      setPhase("");
      setProgress(0);
    }
  };

  return (
    <ToolShell
      crumb="MEDIA-CONVERTER"
      title="The transmute."
      tagline="Drop the MP4 you got via Cobalt (or any audio/video), trim the exact seconds, walk out with MP3, WAV, OGG, M4A or FLAC. Decoded and encoded in your tab — WAV is instant, the rest use a one-time ~30MB engine."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source + trim
            <Music className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {fileName ? "Pick another file" : "Drop or pick MP4 / WebM / MP3 / WAV…"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              From Cobalt or anywhere — decoded locally, never uploaded
            </p>
          </button>

          {fileName && (
            <p className="mt-2 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              {fileName}{duration ? ` · ${fmt(duration)} · ${audio?.sampleRate} Hz` : ""}
            </p>
          )}

          {url && (
            <audio src={url} controls className="mt-3 w-full" aria-label="Source preview" />
          )}

          {audio && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Start · {fmt(start)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={start}
                  onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.1))}
                  className="mt-2 w-full accent-ink"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  End · {fmt(end)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={end}
                  onChange={(e) => setEnd(Math.min(Math.max(Number(e.target.value), start + 0.1), duration))}
                  className="mt-2 w-full accent-ink"
                />
              </label>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Format</h2>

          <div className="mt-4 grid gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                aria-pressed={format === f.id}
                className={`flex items-center justify-between gap-3 rounded-md border-2 border-ink px-3 py-2 text-left transition-colors duration-200 ease-brutal ${
                  format === f.id ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30"
                }`}
              >
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">{f.label}</span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">{f.note}</span>
              </button>
            ))}
          </div>

          {format !== "wav" && format !== "flac" && (
            <label className="mt-4 block">
              <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Bitrate <span className="text-ink">{bitrate}</span>
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {BITRATES.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBitrate(b)}
                    aria-pressed={bitrate === b}
                    className={`rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                      bitrate === b ? "bg-ink text-paper" : "bg-surface-muted text-ink hover:bg-yellow/30"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </label>
          )}

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Sample rate</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSampleRate(r)}
                  aria-pressed={sampleRate === r}
                  className={`rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${
                    sampleRate === r ? "bg-ink text-paper" : "bg-surface-muted text-ink hover:bg-yellow/30"
                  }`}
                >
                  {r === "keep" ? "Keep" : `${r} Hz`}
                </button>
              ))}
            </div>
          </label>

          {busy && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">{phase || "Working…"}</p>
              {progress > 0 && (
                <div className="mt-2 h-3 overflow-hidden rounded-sm border-2 border-ink bg-surface">
                  <div className="h-full bg-yellow transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
                </div>
              )}
            </div>
          )}

          <Button onClick={() => void convert()} disabled={!audio || busy} className="mt-4 w-full uppercase">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {busy ? phase || "Converting…" : `Convert ${audio ? fmt(Math.max(end - start, 0)) : ""} → ${format.toUpperCase()}`}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Tip: coming from YouTube? <a href="#/tools/yt-clipper" target="_self" className="underline hover:text-ink">Clip the link first</a>,
            grab the MP4 via Cobalt, drop it here.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        WAV encodes natively — MP3/OGG/M4A/FLAC re-encode locally via ffmpeg.wasm. Lossy means smaller; WAV/FLAC keep everything.
      </p>
    </ToolShell>
  );
}
