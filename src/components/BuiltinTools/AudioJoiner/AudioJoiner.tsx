import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, AudioLines, Download, Music, X } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface Track {
  id: number;
  name: string;
  size: number;
  file: File;
}

let nextId = 1;

const encodeWav = (buffer: AudioBuffer): Blob => {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const rate = buffer.sampleRate;
  const bytes = len * numCh * 2;
  const ab = new ArrayBuffer(44 + bytes);
  const dv = new DataView(ab);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  dv.setUint32(4, 36 + bytes, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * numCh * 2, true);
  dv.setUint16(32, numCh * 2, true);
  dv.setUint16(34, 16, true);
  writeStr(36, "data");
  dv.setUint32(40, bytes, true);
  let off = 44;
  for (let ch = 0; ch < numCh; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, data[i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
};

const fmtSize = (b: number) => {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export function AudioJoiner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [format, setFormat] = useState<"wav" | "ogg">("wav");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outName, setOutName] = useState("");
  const [outSize, setOutSize] = useState(0);

  const onPick = (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const fresh = Array.from(files).map((f) => ({ id: nextId++, name: f.name, size: f.size, file: f }));
    setTracks((prev) => [...prev, ...fresh]);
  };

  const move = (id: number, dir: -1 | 1) => {
    setTracks((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const remove = (id: number) => setTracks((prev) => prev.filter((t) => t.id !== id));

  const merge = async () => {
    if (tracks.length < 2) {
      setError("Pick at least two tracks to join.");
      return;
    }
    setBusy(true);
    setProgress(5);
    setError(null);
    setOutUrl(null);
    try {
      const ctx = new AudioContext();
      const buffers: AudioBuffer[] = [];
      for (let i = 0; i < tracks.length; i++) {
        const ab = await tracks[i].file.arrayBuffer();
        try {
          buffers.push(await ctx.decodeAudioData(ab));
        } catch {
          throw new Error(`${tracks[i].name} couldn't be decoded (MP3, WAV, OGG and M4A work best).`);
        }
        setProgress(Math.round(((i + 1) / tracks.length) * 50));
      }
      await ctx.close();
      const totalLen = buffers.reduce((s, b) => s + b.length, 0);
      const off = new OfflineAudioContext(2, totalLen, 48000);
      let t = 0;
      for (const b of buffers) {
        const src = off.createBufferSource();
        src.buffer = b;
        src.connect(off.destination);
        src.start(t);
        t += b.length;
      }
      setProgress(70);
      const outBuf = await off.startRendering();
      setProgress(90);
      let blob: Blob;
      if (format === "wav") {
        blob = encodeWav(outBuf);
      } else {
        const ac = new AudioContext();
        const dest = ac.createMediaStreamDestination();
        const src = ac.createBufferSource();
        src.buffer = outBuf;
        src.connect(dest);
        src.start();
        const rec = new MediaRecorder(dest.stream, { mimeType: "audio/ogg;codecs=opus" });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        const stopped = new Promise<void>((res) => (rec.onstop = () => res()));
        rec.start();
        await new Promise<void>((res) => (src.onended = () => res()));
        rec.stop();
        await stopped;
        await ac.close();
        blob = new Blob(chunks, { type: "audio/ogg" });
      }
      setOutUrl(URL.createObjectURL(blob));
      setOutName(`joined-${tracks.length}-tracks.${format}`);
      setOutSize(blob.size);
      setProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merging failed.");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!outUrl) return;
    const a = document.createElement("a");
    a.href = outUrl;
    a.download = outName;
    a.click();
  };

  return (
    <ToolShell
      crumb="AUDIO-JOINER"
      title="The splice."
      tagline="Stitch audio files together in the order you want — decoded and re-rendered on your machine. Clideo watermarks free merges, audio-joiner.com meters your daily joins, and the export is a text file away."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Tracks
            <Music className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 flex items-center gap-2">
            <label className="block flex-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Output</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "wav" | "ogg")}
                className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
              >
                <option value="wav">WAV (lossless)</option>
                <option value="ogg">OGG (Opus)</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 flex-1 rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-4 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
            >
              <AudioLines className="mx-auto h-5 w-5" aria-hidden="true" />
              <p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-ink">Add tracks</p>
              <p className="mt-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
                MP3 · WAV · OGG · M4A
              </p>
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
            multiple
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files);
              e.target.value = "";
            }}
          />

          {tracks.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {tracks.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5">
                  <span className="w-5 shrink-0 text-center font-mono text-[10px] font-bold text-ink/40">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold text-ink">{t.name}</span>
                  <span className="shrink-0 font-mono text-[9px] font-bold text-ink/40">{fmtSize(t.size)}</span>
                  <span className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => move(t.id, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${t.name} up`}
                      className="rounded-md border-2 border-ink px-1 py-0.5 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/40 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(t.id, 1)}
                      disabled={i === tracks.length - 1}
                      aria-label={`Move ${t.name} down`}
                      className="rounded-md border-2 border-ink px-1 py-0.5 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/40 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-3 w-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      aria-label={`Remove ${t.name}`}
                      className="rounded-md border-2 border-ink px-1 py-0.5 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-red"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => void merge()} disabled={tracks.length < 2 || busy} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            {busy ? "Joining…" : `Join ${tracks.length} track${tracks.length === 1 ? "" : "s"} → ${format.toUpperCase()}`}
          </Button>

          {busy && (
            <div className="mt-3 h-4 overflow-hidden rounded-sm border-2 border-ink bg-surface">
              <div className="h-full bg-yellow transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Joined out</h2>
          {outUrl ? (
            <>
              <audio src={outUrl} controls className="mt-4 w-full" />
              <div className="mt-3 flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold text-ink">{outName}</span>
                <span className="ml-2 shrink-0 font-mono text-[10px] font-bold text-ink/50">{fmtSize(outSize)}</span>
              </div>
              <Button onClick={download} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download {format.toUpperCase()}
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The joined track appears here — playback, size, download
              </p>
            </div>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Concatenation happens in an offline audio context — every sample, in order, on your CPU.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The joiner sites sell you back your own tracks with a watermark on top; the splice itself is free.
      </p>
    </ToolShell>
  );
}