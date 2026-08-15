import { useRef, useState } from "react";
import { Clapperboard, Download, Film, Scissors, Sparkles, Wand2 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import gifenc from "gifenc";

const MAX_FRAMES = 300;

interface GifResult {
  url: string;
  size: number;
  frames: number;
  width: number;
  height: number;
}

const fmt = (t: number) => {
  if (!isFinite(t) || t < 0) return "0:00.0";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${d}`;
};

export function VideoToGif() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const srcUrlRef = useRef<string | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [width, setWidth] = useState(480);
  const [fps, setFps] = useState(12);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [phase, setPhase] = useState("capture");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GifResult | null>(null);

  const onPick = (file: File) => {
    if (srcUrlRef.current) URL.revokeObjectURL(srcUrlRef.current);
    const url = URL.createObjectURL(file);
    srcUrlRef.current = url;
    setSrcUrl(url);
    setDuration(0);
    setStart(0);
    setEnd(0);
    setStatus("idle");
    setResult(null);
    setError(null);
  };

  const setStartHere = () => {
    const t = videoRef.current?.currentTime ?? 0;
    setStart(t);
    if (end <= t) setEnd(duration);
  };

  const setEndHere = () => {
    const t = videoRef.current?.currentTime ?? 0;
    if (t > start) setEnd(t);
  };

  const span = Math.max(0, end - start);
  const frames = Math.min(MAX_FRAMES, Math.max(1, Math.round(span * fps)));
  const canGenerate = !!srcUrl && span > 0.1 && duration > 0;

  const generate = async () => {
    const video = videoRef.current;
    if (!video || !canGenerate) return;
    const s = start;
    const e = Math.min(end, duration);
    const step = (e - s) / frames;
    const h = Math.max(1, Math.round(width * (video.videoHeight / video.videoWidth)));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    setStatus("working");
    setPhase("capture");
    setProgress(0);
    setResult(null);
    setError(null);

    const seek = (t: number) =>
      new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        video.currentTime = t;
      });

    try {
      const { GIFEncoder, quantize, applyPalette } = gifenc;
      const gif = GIFEncoder();
      const delay = 1000 / fps;
      for (let i = 0; i < frames; i++) {
        await seek(s + i * step);
        ctx.drawImage(video, 0, 0, width, h);
        const data = ctx.getImageData(0, 0, width, h).data;
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, width, h, { palette, delay });
        if (i % 3 === 0) {
          setProgress(Math.round((i / frames) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      setPhase("encode");
      await new Promise((r) => setTimeout(r, 0));
      gif.finish();
      const out = new Uint8Array(gif.bytes());
      const blob = new Blob([out], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      setResult({ url, size: blob.size, frames, width, height: h });
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not encode that clip.");
      setStatus("error");
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = `clip-${width}x${result.height}-${fps}fps.gif`;
    a.click();
  };

  return (
    <ToolShell
      crumb="VIDEO-GIF"
      title="The GIF maker."
      tagline="Kapwing slaps a watermark on every export and counts your minutes — this one encodes in your tab. No watermark, no cap, no 3-day expiry."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Clip
            <Film className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {srcUrl ? "Pick another video" : "Drop or pick a video"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              MP4, WebM, MOV… the file never leaves your tab
            </p>
          </button>

          {srcUrl && (
            <div className="mt-4 space-y-4">
              <video
                ref={videoRef}
                src={srcUrl}
                controls
                preload="metadata"
                playsInline
                className="w-full rounded-md border-2 border-ink bg-ink"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (isFinite(d)) {
                    setDuration(d);
                    setEnd(d);
                  }
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={setStartHere}
                  className="rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
                >
                  <Scissors className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  Start here
                </button>
                <button
                  type="button"
                  onClick={setEndHere}
                  className="rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
                >
                  End here
                  <Scissors className="ml-1 inline h-3 w-3 -scale-x-100" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStart(0);
                    setEnd(duration);
                  }}
                  className="rounded-md border-2 border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-red/15 active:translate-y-0"
                >
                  Reset clip
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border-2 border-ink bg-surface-muted p-2.5 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Start</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-ink">{fmt(start)}</p>
                </div>
                <div className="rounded-md border-2 border-ink bg-surface-muted p-2.5 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">End</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-ink">{fmt(end || duration)}</p>
                </div>
                <div className="rounded-md border-2 border-ink bg-surface-muted p-2.5 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Clip</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-yellow-700">{span.toFixed(1)}s</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Settings
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Width — {width}px
              </span>
              <input
                type="range"
                min={160}
                max={960}
                step={16}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                FPS — {fps}
              </span>
              <input
                type="range"
                min={5}
                max={24}
                step={1}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <p className="rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
              {frames} frame{frames === 1 ? "" : "s"} to encode{frames >= MAX_FRAMES ? " — clipped to 300, shorten the range or lower FPS" : ""}.
              The encode is done here, frame by frame — that's the part Kapwing gates behind a subscription.
            </p>
            <Button onClick={generate} disabled={!canGenerate || status === "working"} className="w-full uppercase">
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              {status === "working" ? "Encoding…" : "Make the GIF"}
            </Button>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          [03] Output
          <Clapperboard className="h-4 w-4" aria-hidden="true" />
        </h2>

        {status === "working" && (
          <div className="mt-4 flex flex-col gap-3 rounded-md border-2 border-ink bg-ink p-6">
            <div className="h-5 w-full overflow-hidden rounded-md border-2 border-paper/30 bg-paper/10">
              <div className="h-full bg-yellow transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-paper">
              {phase === "capture" ? "Grabbing frames" : "Encoding GIF"} — {progress}%
            </p>
          </div>
        )}

        {status === "done" && result && (
          <div className="mt-4 flex flex-wrap items-start gap-5">
            <img
              src={result.url}
              alt="Your generated GIF"
              className="max-h-[24rem] rounded-md border-2 border-ink bg-paper object-contain"
            />
            <div className="min-w-52 flex-1">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">
                {result.width}×{result.height} · {result.frames} frames ·{" "}
                {(result.size / 1024).toFixed(0)} KB · no watermark, no expiry
              </p>
              <Button onClick={download} className="mt-4 uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download GIF
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
            [ ERROR ] {error}
          </p>
        )}

        {status === "idle" && (
          <div className="mt-4 flex items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
            <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
              Your GIF appears here
              <br />
              <span className="text-[10px] font-semibold">
                Pick a clip first — then hit "Make the GIF". Nothing is uploaded, ever.
              </span>
            </p>
          </div>
        )}
      </section>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Encoded locally with gifenc — the GIF maker with no watermark, no 30-minute cap and no 3-day storage.
      </p>
    </ToolShell>
  );
}
