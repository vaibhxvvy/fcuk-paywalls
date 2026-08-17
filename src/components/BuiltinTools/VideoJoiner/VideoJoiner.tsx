import { useRef, useState } from "react";
import { Combine, Film, GripVertical, Trash2, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

type Item = { id: number; file: File; url: string; meta: string };

const QUALITY: Record<string, number | undefined> = {
  "1 Mbps": 1_000_000,
  "2.5 Mbps": 2_500_000,
  "6 Mbps": 6_000_000,
  "Browser default": undefined,
};

export function VideoJoiner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState("Browser default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const nextId = useRef(1);

  const add = (files: FileList | null) => {
    if (!files) return;
    const fresh: Item[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("video/")) continue;
      fresh.push({ id: nextId.current++, file: f, url: URL.createObjectURL(f), meta: `${(f.size / 1048576).toFixed(1)} MB` });
    }
    if (fresh.length === 0) {
      setError("NO VIDEO FILES");
      return;
    }
    setItems((prev) => [...prev, ...fresh]);
    setError(null);
    setDone(null);
  };

  const remove = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDone(null);
  };

  const move = (id: number, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const join = async () => {
    if (items.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    let stream: MediaStream | null = null;
    try {
      const videos = items.map((i) => {
        const v = document.createElement("video");
        v.src = i.url;
        v.muted = false;
        v.crossOrigin = "anonymous";
        v.playsInline = true;
        return v;
      });

      let width = 0;
      let height = 0;
      for (const v of videos) {
        width = Math.max(width, v.videoWidth || 640);
        height = Math.max(height, v.videoHeight || 360);
      }
      width = Math.min(width, 1920);
      height = Math.min(height, 1080);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      const videoTrack = canvas.captureStream(30).getVideoTracks()[0];

      const actx = new AudioContext();
      const dest = actx.createMediaStreamDestination();
      const sources: MediaElementAudioSourceNode[] = [];
      for (const v of videos) sources.push(actx.createMediaElementSource(v));

      const allTracks: MediaStreamTrack[] = [videoTrack, ...dest.stream.getAudioTracks()];
      stream = new MediaStream(allTracks);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: QUALITY[quality],
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start(500);

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        setProgress(`[ ${i + 1}/${videos.length} ] ${items[i].file.name}`);
        sources[i].connect(dest);
        await v.play();
        await new Promise<void>((resolve) => {
          const draw = () => {
            if (v.ended) {
              ctx.fillStyle = "#000";
              ctx.fillRect(0, 0, width, height);
              resolve();
              return;
            }
            ctx.drawImage(v, 0, 0, width, height);
            requestAnimationFrame(draw);
          };
          requestAnimationFrame(draw);
        });
      }

      recorder.stop();
      await stopped;
      actx.close();

      const blob = new Blob(chunks, { type: "video/webm" });
      const a = document.createElement("a");
      a.download = "fcuk-joined.webm";
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      const secs = videos.reduce((s, v) => s + (v.duration || 0), 0);
      setDone(
        `[ OK ] ${items.length} CLIP${items.length > 1 ? "S" : ""} → ONE WEBM — ${(secs / 60).toFixed(1)} MIN, ${(blob.size / 1048576).toFixed(1)} MB`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Join failed — check the clips are playable.");
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <ToolShell
      crumb="VIDEO-JOINER"
      title="The splicer."
      tagline="Merge any number of clips into one video, in the order you pick — no account, no watermark, no length cap. Kapwing's free plan watermarks every export and cuts you off at one minute; Pro is $16/mo."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The clips</h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              Pick clips — any count, any order, reorder below
            </p>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
              Everything decodes locally — nothing uploads
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />

          <ul className="mt-4 space-y-2">
            {items.map((it, idx) => (
              <li
                key={it.id}
                className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2"
              >
                <span className="w-6 shrink-0 text-center font-mono text-[10px] font-bold text-ink/40">{idx + 1}</span>
                <Film className="h-4 w-4 shrink-0 text-ink/40" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-ink">{it.file.name}</span>
                <span className="shrink-0 font-mono text-[10px] font-bold text-ink/40">{it.meta}</span>
                <button
                  type="button"
                  onClick={() => move(it.id, -1)}
                  disabled={idx === 0}
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink disabled:opacity-30"
                  aria-label={`Move ${it.file.name} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(it.id, 1)}
                  disabled={idx === items.length - 1}
                  className="rounded border-2 border-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink disabled:opacity-30"
                  aria-label={`Move ${it.file.name} down`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="rounded border-2 border-ink px-1.5 py-0.5 text-ink hover:bg-red/30"
                  aria-label={`Remove ${it.file.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="rounded-md border-2 border-dashed border-ink/30 p-4 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink/30">
                <GripVertical className="mx-auto h-5 w-5" aria-hidden="true" />
                No clips yet — they stack here in join order
              </li>
            )}
          </ul>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Quality (bitrate)</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.keys(QUALITY).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`flex-1 rounded-md border-2 border-ink px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-[background-color] duration-200 ease-brutal ${
                    quality === q ? "bg-yellow" : "bg-surface-muted hover:bg-yellow/40"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </label>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The merge</h2>

          <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
            <div className="text-center">
              <Combine className="mx-auto h-10 w-10 text-ink/30" aria-hidden="true" />
              <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                {progress || "One .webm lands here — clips played end-to-end in order"}
              </p>
            </div>
          </div>

          <Button onClick={() => void join()} disabled={busy || items.length === 0} className="mt-4 w-full uppercase">
            <Combine className="h-4 w-4" aria-hidden="true" />
            {busy ? "Joining…" : `Join ${items.length || ""} clip${items.length === 1 ? "" : "s"} → WebM`}
          </Button>

          {done && (
            <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
              {done}
            </p>
          )}

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            WebM (VP9 + Opus) plays in every modern browser, VLC and mpv. No watermark stamped on the
            export, no 1-minute ceiling, no 3-day deletion.
          </p>
        </section>
      </div>
    </ToolShell>
  );
}