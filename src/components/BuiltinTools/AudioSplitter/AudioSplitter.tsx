import { useRef, useState } from "react";
import { Scissors, ScissorsLineDashed, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";

type Mode = "chunks" | "silence";

function encodeWav(buf: AudioBuffer): Uint8Array {
  const numCh = buf.numberOfChannels;
  const len = buf.length;
  const bytesPerSample = 2;
  const dataSize = len * numCh * bytesPerSample;
  const out = new Uint8Array(44 + dataSize);
  const dv = new DataView(out.buffer);
  const wStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  wStr(0, "RIFF");
  dv.setUint32(4, 36 + dataSize, true);
  wStr(8, "WAVE");
  wStr(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, buf.sampleRate, true);
  dv.setUint32(28, buf.sampleRate * numCh * bytesPerSample, true);
  dv.setUint16(32, numCh * bytesPerSample, true);
  dv.setUint16(34, 16, true);
  wStr(36, "data");
  dv.setUint32(40, dataSize, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      dv.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out;
}

function toWavPart(audio: AudioBuffer, start: number, end: number): Uint8Array {
  const len = end - start;
  const part = new AudioBuffer({ length: len, numberOfChannels: audio.numberOfChannels, sampleRate: audio.sampleRate });
  for (let c = 0; c < audio.numberOfChannels; c++) {
    part.copyToChannel(audio.getChannelData(c).subarray(start, end), c);
  }
  return encodeWav(part);
}

function silenceBoundaries(audio: AudioBuffer, thresholdDb: number, minSilenceSec: number): number[] {
  const sr = audio.sampleRate;
  const ch = audio.getChannelData(0);
  const win = 2048;
  const n = Math.floor(ch.length / win);
  const linear = Math.pow(10, thresholdDb / 20);
  const silent = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < win; j += 8) {
      const v = ch[i * win + j];
      sum += v * v;
    }
    silent[i] = sum / (win / 8) < linear * linear ? 1 : 0;
  }
  const minWin = Math.max(1, Math.round(minSilenceSec * sr / win));
  const bounds: number[] = [];
  let run = 0;
  for (let i = 0; i <= n; i++) {
    if (i < n && silent[i]) {
      run += 1;
    } else {
      if (run >= minWin) bounds.push(Math.round((i - run / 2) * win));
      run = 0;
    }
  }
  return bounds;
}

export function AudioSplitter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("chunks");
  const [chunkSec, setChunkSec] = useState(60);
  const [minSilence, setMinSilence] = useState(1);
  const [thresholdDb, setThresholdDb] = useState(-45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = async (file: File) => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { zipSync } = await import("fflate");
      const buf = await file.arrayBuffer();
      const actx = new AudioContext();
      const audio = await actx.decodeAudioData(buf.slice(0));
      await actx.close();

      const sr = audio.sampleRate;
      const parts: { start: number; end: number }[] = [];
      if (mode === "chunks") {
        const step = Math.max(1, Math.round(chunkSec * sr));
        for (let s = 0; s < audio.length; s += step) parts.push({ start: s, end: Math.min(s + step, audio.length) });
      } else {
        const bounds = silenceBoundaries(audio, thresholdDb, minSilence);
        let prev = 0;
        for (const b of bounds) {
          if (b - prev > sr * 0.5) parts.push({ start: prev, end: b });
          prev = b;
        }
        if (audio.length - prev > sr * 0.5) parts.push({ start: prev, end: audio.length });
      }

      if (parts.length === 0) throw new Error("No splits found — lower the silence threshold.");
      const files: Record<string, Uint8Array> = {};
      const pad = String(parts.length).length;
      parts.forEach((p, i) => {
        files[`${file.name.replace(/\.[^.]+$/, "")}-${String(i + 1).padStart(pad, "0")}.wav`] = toWavPart(audio, p.start, p.end);
      });
      const zipped = zipSync(files);
      const blob = new Blob([zipped], { type: "application/zip" });
      const a = document.createElement("a");
      a.download = `fcuk-split-${parts.length}.zip`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(`[ OK ] ${parts.length} PARTS IN ONE ZIP — ${(blob.size / 1024).toFixed(0)} KB`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolShell
      crumb="AUDIO-SPLITTER"
      title="The cleaver."
      tagline="Cut one audio file into many — fixed-length chunks or split at the silences. The online cutters ration free users to one job an hour and watermark the downloads; slicing samples is a loop."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The file</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              Pick audio — MP3, WAV, OGG, M4A…
            </p>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              Decoded and split right here — the file never uploads
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void run(f);
              e.target.value = "";
            }}
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("chunks")}
              className={`flex items-center justify-center gap-2 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-[background-color,box-shadow] duration-200 ease-brutal ${
                mode === "chunks" ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/40"
              }`}
            >
              <ScissorsLineDashed className="h-4 w-4" aria-hidden="true" />
              Fixed chunks
            </button>
            <button
              type="button"
              onClick={() => setMode("silence")}
              className={`flex items-center justify-center gap-2 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink transition-[background-color,box-shadow] duration-200 ease-brutal ${
                mode === "silence" ? "bg-yellow shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/40"
              }`}
            >
              <Scissors className="h-4 w-4" aria-hidden="true" />
              At silence
            </button>
          </div>

          {mode === "chunks" && (
            <label className="mt-4 block">
              <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Chunk length <span className="text-ink">{chunkSec}s</span>
              </span>
              <input
                type="range"
                min={10}
                max={300}
                step={5}
                value={chunkSec}
                onChange={(e) => setChunkSec(Number(e.target.value))}
                className="mt-1.5 w-full accent-yellow"
              />
            </label>
          )}

          {mode === "silence" && (
            <>
              <label className="mt-4 block">
                <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Minimum silence <span className="text-ink">{minSilence}s</span>
                </span>
                <input
                  type="range"
                  min={0.3}
                  max={5}
                  step={0.1}
                  value={minSilence}
                  onChange={(e) => setMinSilence(Number(e.target.value))}
                  className="mt-1.5 w-full accent-yellow"
                />
              </label>
              <label className="mt-4 block">
                <span className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Silence threshold <span className="text-ink">{thresholdDb} dB</span>
                </span>
                <input
                  type="range"
                  min={-70}
                  max={-20}
                  step={1}
                  value={thresholdDb}
                  onChange={(e) => setThresholdDb(Number(e.target.value))}
                  className="mt-1.5 w-full accent-yellow"
                />
              </label>
            </>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The parts</h2>

          <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
            <div className="text-center">
              <Scissors className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Pick a file — the WAV parts land here as one ZIP
              </p>
            </div>
          </div>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Chunks cut on exact sample boundaries — no re-encoding beyond a lossless 16-bit WAV, no quality
            loss, no hourly ration.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}