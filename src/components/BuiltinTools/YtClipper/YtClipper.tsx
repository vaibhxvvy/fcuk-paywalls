import { useState } from "react";
import { Link2, Clapperboard, FileDown, Copy, Check, ExternalLink } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const INVIDIOUS = ["https://inv.nadeko.net", "https://yewtu.be", "https://invidious.nerdvpn.de"];

interface VideoMeta {
  title: string;
  author: string;
  duration: number | null;
  source: "oembed" | "invidious" | "thumbnail-only";
}

function parseVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      // /watch?v=
      const v = u.searchParams.get("v");
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
      // /shorts/ /embed/ /live/ /v/
      const m = /^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
      if (m) return m[2];
    }
  } catch {
    // not a URL — fall through
  }
  // last resort: find an 11-char token anywhere
  const m = /([A-Za-z0-9_-]{11})/.exec(s);
  return m ? m[1] : null;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
};

function parseTimestamp(s: string): number {
  const t = s.trim().toLowerCase();
  if (!t) return 0;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.max(0, Number(t));
  // 1h2m3s / 2m30s / 90s
  const hms = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/.exec(t);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return (Number(hms[1] ?? 0) * 3600) + (Number(hms[2] ?? 0) * 60) + Number(hms[3] ?? 0);
  }
  // mm:ss / hh:mm:ss
  const parts = t.split(":").map(Number);
  if (parts.every((n) => Number.isFinite(n))) {
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  return 0;
}

async function fetchMeta(id: string): Promise<VideoMeta> {
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  // 1. oEmbed — fast, CORS-enabled, title + author (no duration)
  let title = "";
  let author = "";
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`);
    if (res.ok) {
      const d = (await res.json()) as { title?: string; author_name?: string };
      title = d.title ?? "";
      author = d.author_name ?? "";
    }
  } catch {
    // fall through to invidious
  }
  // 2. Invidious — duration + better title fallback
  for (const inst of INVIDIOUS) {
    try {
      const res = await fetch(`${inst}/api/v1/videos/${id}?fields=title,author,lengthSeconds`);
      if (!res.ok) continue;
      const d = (await res.json()) as { title?: string; author?: string; lengthSeconds?: number };
      return {
        title: d.title ?? title ?? "Untitled video",
        author: d.author ?? author ?? "",
        duration: typeof d.lengthSeconds === "number" ? d.lengthSeconds : null,
        source: "invidious",
      };
    } catch {
      // try next instance
    }
  }
  if (title) return { title, author, duration: null, source: "oembed" };
  return { title: "Untitled video", author: "", duration: null, source: "thumbnail-only" };
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setOk(true);
          window.setTimeout(() => setOk(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/40"
      aria-label={`Copy ${label}`}
    >
      {ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {ok ? "Copied" : label}
    </button>
  );
}

export function YtClipper() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [loop, setLoop] = useState(true);

  const go = async () => {
    const id = parseVideoId(url);
    if (!id) {
      setError("That does not look like a YouTube link — paste a watch, youtu.be, shorts or embed URL, or a bare video ID.");
      return;
    }
    setLoading(true);
    setError(null);
    setVideoId(id);
    setMeta(null);
    try {
      const m = await fetchMeta(id);
      setMeta(m);
      setStart(0);
      setEnd(m.duration ?? 0);
    } catch {
      setMeta({ title: "Untitled video", author: "", duration: null, source: "thumbnail-only" });
    } finally {
      setLoading(false);
    }
  };

  const duration = meta?.duration ?? null;
  const hasRange = duration !== null && duration > 0 ? end > start : end >= start;
  const clipLen = Math.max(0, end - start);
  const shareUrl = videoId ? `https://youtu.be/${videoId}?t=${Math.floor(start)}s` : "";
  const endParam = duration !== null && end < duration - 1 ? `&end=${Math.floor(end)}` : "";
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?start=${Math.floor(start)}${endParam}${loop ? "&autoplay=1&loop=1&playlist=" + videoId : ""}`
    : "";
  const cobaltUrl = videoId ? `https://cobalt.tools/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}` : "";

  const clampStart = (t: number) => {
    const max = duration !== null ? duration : Math.max(t, end);
    return Math.max(0, Math.min(t, (duration !== null ? Math.min(end, duration) : end) - 0.5, max));
  };

  return (
    <ToolShell
      crumb="YT-CLIPPER"
      title="The clip."
      tagline="Paste a YouTube link, preview it here, pick the exact seconds — share a timestamped link or grab the MP4 via Cobalt and finish it in the trimmer. No backend, nothing uploaded."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The link
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </h2>
          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              YouTube URL or video ID
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void go();
              }}
              placeholder="https://www.youtube.com/watch?v=… or youtu.be/…"
              className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
              spellCheck={false}
            />
          </label>
          <Button onClick={() => void go()} disabled={loading || !url.trim()} className="mt-3 w-full uppercase">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
            {loading ? "Loading preview…" : meta ? "Reload preview" : "Preview video"}
          </Button>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}

          {videoId && (
            <div className="mt-4 overflow-hidden rounded-md border-2 border-ink bg-ink">
              <div className="aspect-video w-full">
                {/* nocookie embed respects privacy + allows start/end params */}
                <iframe
                  key={embedUrl}
                  src={videoId && (start > 0 || endParam || loop === false) ? embedUrl : `https://www.youtube-nocookie.com/embed/${videoId}`}
                  title={meta?.title ?? "YouTube preview"}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <p className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-paper/80">
                  {loading ? "Loading…" : (meta?.title ?? "Untitled video")}
                  {meta?.author ? ` — ${meta.author}` : ""}
                </p>
                {meta && (
                  <span className="shrink-0 rounded-sm border border-paper/30 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-paper/50">
                    via {meta.source === "invidious" ? "invidious" : meta.source === "oembed" ? "oembed" : "thumbnail"}
                  </span>
                )}
              </div>
            </div>
          )}

          {videoId && !loading && meta?.duration === null && (
            <p className="mt-3 rounded-md border-2 border-dashed border-ink/40 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Duration unknown (metadata blocked) — type start/end seconds manually below. Preview still plays.
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The cut</h2>

          {!videoId ? (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Paste a link — the time-clip controls land here
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Start (sec or m:ss)
                  </span>
                  <input
                    type="text"
                    value={fmt(start)}
                    onChange={(e) => setStart(clampStart(parseTimestamp(e.target.value)))}
                    className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none focus:border-yellow"
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration ?? Math.max(end, 600)}
                    step={1}
                    value={start}
                    onChange={(e) => setStart(clampStart(Number(e.target.value)))}
                    className="mt-2 w-full accent-ink"
                    aria-label="Clip start"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    End (sec or m:ss)
                  </span>
                  <input
                    type="text"
                    value={duration !== null && end >= duration ? fmt(duration) : fmt(end)}
                    onChange={(e) => {
                      const t = parseTimestamp(e.target.value);
                      const max = duration ?? Math.max(t, start + 0.5);
                      setEnd(Math.min(Math.max(t, start + 0.5), max));
                    }}
                    className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none focus:border-yellow"
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration ?? Math.max(end, 600)}
                    step={1}
                    value={end}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      const max = duration ?? t;
                      setEnd(Math.min(Math.max(t, start + 0.5), max));
                    }}
                    className="mt-2 w-full accent-ink"
                    aria-label="Clip end"
                  />
                </label>
              </div>

              <label className="mt-3 flex cursor-pointer items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="h-4 w-4 accent-yellow"
                />
                Loop preview clip
              </label>

              <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Clip: {fmt(start)} → {fmt(end)} · {fmt(clipLen)} long
                {duration !== null ? ` · video ${fmt(duration)}` : ""}
              </p>

              {!hasRange && (
                <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  [ ERROR ] End must be after start.
                </p>
              )}

              <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Share this moment</p>
                <p className="mt-1 break-all font-mono text-xs font-bold text-ink">{shareUrl}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CopyButton text={shareUrl} label="Copy link" />
                  <CopyButton text={embedUrl} label="Copy embed" />
                </div>
              </div>

              <div className="mt-3 rounded-md border-2 border-ink bg-yellow/20 p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                  Want the MP4 file?
                </p>
                <p className="mt-1 text-xs font-medium text-ink/80">
                  Browsers can't pull YouTube streams directly (CORS + signatures). Open Cobalt, paste the
                  same link, download the MP4 — then drop it into the trimmer or converter below. Two hops,
                  zero uploads to us.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    href={cobaltUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-paper transition-colors hover:bg-ink/80"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Open in Cobalt
                  </a>
                  <a
                    href="#/tools/video-trimmer"
                    target="_self"
                    className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-surface px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-yellow/40"
                  >
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                    To trimmer
                  </a>
                  <a
                    href="#/tools/media-converter"
                    target="_self"
                    className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink bg-surface px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-yellow/40"
                  >
                    To converter
                  </a>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Preview stays on YouTube's embed — we never proxy the video. Only download what you have the right to keep.
      </p>
    </ToolShell>
  );
}
