import { useEffect, useRef, useState } from "react";
import { Film, FileDown, Play, Square } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export function VideoTrimmer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [state, setState] = useState<"idle" | "recording">("idle");
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onT = () => {
      if (state === "recording") {
        setProgress(v.currentTime - start);
        if (v.currentTime >= end) stopRecording(true);
      }
    };
    const onMeta = () => {
      setDuration(v.duration);
      setEnd(v.duration);
    };
    v.addEventListener("timeupdate", onT);
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("timeupdate", onT);
      v.removeEventListener("loadedmetadata", onMeta);
      cancelAnimationFrame(rafRef.current);
    };
  }, [state, start, end]);

  useEffect(() => () => recRef.current?.stream.getTracks().forEach((t) => t.stop()), []);

  const onFile = (f: File) => {
    setName(f.name);
    setDone(null);
    setError(null);
    if (url) URL.revokeObjectURL(url);
    const u = URL.createObjectURL(f);
    setUrl(u);
    const v = videoRef.current;
    if (v) {
      v.src = u;
      v.load();
    }
  };

  const pickMime = (): string => {
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
    if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
    return "video/mp4";
  };

  const stopRecording = (auto: boolean) => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = start;
    }
    if (!auto) setState("idle");
  };

  const startRecording = () => {
    const v = videoRef.current;
    if (!v || duration === 0) return;
    if (end - start < 0.25) {
      setError("The trimmed range is too short — pick at least a quarter second.");
      return;
    }
    setError(null);
    setDone(null);
    setState("recording");
    setProgress(0);
    chunksRef.current = [];
    const stream = (v as HTMLVideoElement & { captureStream(fps?: number): MediaStream }).captureStream(30);
    const mime = pickMime();
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    recRef.current = rec;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mime.includes("mp4") ? "video/mp4" : "video/webm" });
      const out = URL.createObjectURL(blob);
      setDone(out);
      setState("idle");
    };
    rec.start(250);
    v.currentTime = start;
    v.play();
  };

  return (
    <ToolShell
      crumb="VIDEO-TRIMMER"
      title="The snip."
      tagline="Cut a video down to just the part you need — preview, trim, capture, done. The cloud trimmers upload your file to a server and charge for the privilege; this one never leaves your machine."
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
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? "Pick another video" : "Drop or pick a video"}
            </p>
          </button>

          {url && (
            <video
              ref={videoRef}
              src={url}
              className="mt-4 max-h-72 w-full rounded-md border-2 border-ink bg-ink object-contain"
              controls
            />
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Start</span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                value={start}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setStart(Math.min(s, end - 0.25));
                  const v = videoRef.current;
                  if (v) v.currentTime = s;
                }}
                className="mt-2 w-full accent-ink"
              />
              <span className="mt-1 block font-mono text-[10px] font-bold text-ink/60">{fmt(start)}</span>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">End</span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                value={end}
                onChange={(e) => {
                  const en = Number(e.target.value);
                  setEnd(Math.min(Math.max(en, start + 0.25), duration));
                }}
                className="mt-2 w-full accent-ink"
              />
              <span className="mt-1 block font-mono text-[10px] font-bold text-ink/60">{fmt(end)}</span>
            </label>
          </div>

          <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            Trim length: {fmt(Math.max(end - start, 0))} · captured locally at playback speed
          </p>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Capture</h2>

          {state === "idle" && !done && (
            <>
              <Button onClick={startRecording} disabled={!url} className="mt-4 w-full uppercase">
                <Play className="h-4 w-4" aria-hidden="true" />
                Capture {fmt(Math.max(end - start, 0))} clip
              </Button>
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                Plays the clip at 1× while recording to WebM — the honest way, no server uploads.
              </p>
            </>
          )}

          {state === "recording" && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-red">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red" aria-hidden="true" />
                  Recording
                </span>
                <span className="font-mono text-xs font-bold text-ink">{fmt(progress)} / {fmt(end - start)}</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-sm border-2 border-ink bg-surface">
                <div
                  className="h-full bg-red transition-[width] duration-200 ease-linear"
                  style={{ width: `${(progress / Math.max(end - start, 0.01)) * 100}%` }}
                />
              </div>
              <Button variant="destructive" onClick={() => stopRecording(false)} className="mt-4 w-full uppercase">
                <Square className="h-4 w-4" aria-hidden="true" />
                Stop
              </Button>
            </div>
          )}

          {done && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <video src={done} className="w-full rounded-sm border-2 border-ink" controls />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = done;
                    a.download = `${name.replace(/\.[^.]+$/, "")}-trimmed.webm`;
                    a.click();
                  }}
                  className="uppercase"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Download WebM
                </Button>
                <Button variant="secondary" onClick={startRecording} className="uppercase">
                  Re-capture
                </Button>
              </div>
            </div>
          )}

          {!url && (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The trimmer appears once a video is loaded
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Trimmed locally — the cloud trimmer's watermark is free at the price of your privacy; here the trade is reversed.
      </p>
    </ToolShell>
  );
}