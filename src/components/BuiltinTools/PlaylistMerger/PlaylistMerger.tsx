import { useState } from "react";
import { FileDown, Link2, ListMusic, Play } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface Video {
  id: string;
  title: string;
  author?: string;
  length?: string;
}

interface PlaylistData {
  title: string;
  id: string;
  videos: Video[];
}

const INVIDIOUS = ["https://inv.nadeko.net", "https://yewtu.be", "https://invidious.nerdvpn.de"];

async function fetchPlaylist(input: string): Promise<PlaylistData> {
  const id =
    /[?&]list=([^#&?]+)/.exec(input)?.[1] ?? /^([A-Za-z0-9_-]{13,})$/.exec(input)?.[1];
  if (!id) throw new Error("That does not look like a playlist URL or ID");

  let innerErr: Error | null = null;
  try {
    const { default: ytfps } = await import("@maroxy/ytfps");
    const p = await ytfps(id);
    return {
      title: p.title,
      id: p.id,
      videos: p.videos.map((v) => ({
        id: v.id,
        title: v.title,
        author: v.author.name,
        length: v.length,
      })),
    };
  } catch (e) {
    innerErr = e instanceof Error ? e : null;
  }

  for (const inst of INVIDIOUS) {
    try {
      const videos: Video[] = [];
      let page = 1;
      let continuation = "";
      let title = "";
      do {
        const res = await fetch(
          `${inst}/api/v1/playlists/${encodeURIComponent(id)}?page=${page}&fields=title,videos,continuation`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as {
          title?: string;
          videos?: { id: string; title: string; author?: string }[];
          continuation?: string;
        };
        title = d.title ?? title;
        videos.push(
          ...(d.videos ?? []).map((v) => ({ id: v.id, title: v.title, author: v.author })),
        );
        continuation = d.continuation ?? "";
        page += 1;
      } while (continuation && videos.length < 1000);
      if (videos.length === 0) throw new Error("empty playlist");
      return { title: title || "Untitled playlist", id, videos };
    } catch {
      // try the next instance
    }
  }

  throw new Error(
    innerErr?.message.includes("private")
      ? innerErr.message
      : "Could not fetch the playlist from any source — check the link, or the playlist may be private.",
  );
}

interface MergedItem {
  video: Video;
  source: string;
}

interface MergedResult {
  items: MergedItem[];
  skipped: number;
  m3u: string;
}

function PlaylistSlot({
  slot,
  placeholder,
  onLoaded,
}: {
  slot: string;
  placeholder: string;
  onLoaded: (d: PlaylistData) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlaylistData | null>(null);

  const go = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPlaylist(url.trim());
      setData(d);
      onLoaded(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
      <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">{slot}</h2>

      <label className="mt-4 block">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
          Playlist URL or ID
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void go();
          }}
          placeholder={placeholder}
          className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
        />
      </label>

      <Button size="sm" onClick={() => void go()} disabled={loading || !url.trim()} className="mt-3 w-full uppercase">
        <Link2 className="h-4 w-4" aria-hidden="true" />
        {loading ? "Pulling the list…" : data ? "Refetch" : "Fetch playlist"}
      </Button>

      {error && (
        <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
          [ ERROR ] {error}
        </p>
      )}

      {data && (
        <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
          <p className="truncate font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
            {data.title}
          </p>
          <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
            {data.videos.length} videos · {data.id}
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-1">
            {data.videos.slice(0, 8).map((v, i) => (
              <li key={v.id} className="flex items-center gap-2 font-mono text-[10px] text-ink/70">
                <span className="w-4 shrink-0 text-ink/40">{i + 1}</span>
                <span className="truncate">{v.title}</span>
                {v.length && <span className="shrink-0 text-ink/40">{v.length}</span>}
              </li>
            ))}
            {data.videos.length > 8 && (
              <li className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                … +{data.videos.length - 8} more
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

export function PlaylistMerger() {
  const [base, setBase] = useState<PlaylistData | null>(null);
  const [addon, setAddon] = useState<PlaylistData | null>(null);
  const [skipDupes, setSkipDupes] = useState(true);
  const [merged, setMerged] = useState<MergedResult | null>(null);

  const splice = () => {
    if (!base || !addon) return;
    const seen = new Set<string>();
    const items: MergedItem[] = [];
    const push = (v: Video, source: string) => {
      if (skipDupes && seen.has(v.id)) return;
      seen.add(v.id);
      items.push({ video: v, source });
    };
    base.videos.forEach((v) => push(v, base.title));
    addon.videos.forEach((v) => push(v, addon.title));
    const skipped = base.videos.length + addon.videos.length - items.length;
    const m3u = [
      "#EXTM3U",
      ...items.map(
        (m) =>
          `#EXTINF:-1,${m.video.title.replace(/[\r\n]+/g, " ")}\nhttps://www.youtube.com/watch?v=${m.video.id}`,
      ),
    ].join("\n");
    setMerged({ items, skipped, m3u });
  };

  const downloadM3u = () => {
    if (!merged) return;
    const blob = new Blob([merged.m3u], { type: "audio/x-mpegurl" });
    const a = document.createElement("a");
    a.download = "merged-queue.m3u";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadCsv = () => {
    if (!merged) return;
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [
      "video_id,title,author,source",
      ...merged.items.map((m) =>
        [m.video.id, esc(m.video.title), esc(m.video.author ?? ""), esc(m.source)].join(","),
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.download = "merged-playlist.csv";
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ToolShell
      crumb="PLAYLIST-MERGER"
      title="The splice."
      tagline="Merge two YouTube playlists into one — paste your playlist, paste another, get a playlist file that plays the whole merged list in order. YouTube won't let you graft someone else's playlist; the merged queue and the CSV are yours."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <PlaylistSlot
          slot="[01] The base — your playlist"
          placeholder="https://www.youtube.com/playlist?list=…"
          onLoaded={(d) => {
            setBase(d);
            setMerged(null);
          }}
        />
        <PlaylistSlot
          slot="[02] The add-on — the other playlist"
          placeholder="…or a bare playlist ID"
          onLoaded={(d) => {
            setAddon(d);
            setMerged(null);
          }}
        />
      </div>

      {base && addon && (
        <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [03] The splice
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              <input
                type="checkbox"
                checked={skipDupes}
                onChange={(e) => setSkipDupes(e.target.checked)}
                className="h-4 w-4 accent-yellow"
              />
              Skip duplicates
            </label>
            <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              {base.videos.length} + {addon.videos.length} ={" "}
              {merged ? merged.items.length : "…"}
            </span>
          </div>

          <Button onClick={splice} className="mt-4 w-full uppercase">
            <ListMusic className="h-4 w-4" aria-hidden="true" />
            Splice {base.videos.length} + {addon.videos.length} videos
          </Button>

          {merged && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Merged queue
              </p>
              <p className="mt-1 font-mono text-xs font-bold text-ink">
                {base.videos.length} + {addon.videos.length} → {merged.items.length} videos
                {merged.skipped > 0 ? ` — ${merged.skipped} duplicates skipped` : ""}
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button size="sm" onClick={downloadM3u} className="uppercase">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Download .m3u — open in VLC / mpv
                </Button>
                <Button size="sm" variant="secondary" onClick={downloadCsv} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Download CSV ({merged.items.length} rows)
                </Button>
              </div>
              <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                YouTube killed the old watch_videos queue link — the .m3u file plays the whole merged list
                in order in any player that understands YouTube URLs.
              </p>
              <ul className="mt-3 max-h-72 space-y-1 overflow-auto pr-1">
                {merged.items.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-sm px-1 py-0.5 hover:bg-yellow/20">
                    <span className="w-6 shrink-0 font-mono text-[10px] font-bold text-ink/40">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold text-ink">
                      {m.video.title}
                    </span>
                    <span className="max-w-40 shrink-0 truncate rounded-sm border border-ink bg-surface px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-ink/50">
                      {m.source}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The .m3u opens the merged queue in VLC, mpv or any player — no account needed. Merging happens in
        your tab; the videos never leave YouTube.
      </p>
    </ToolShell>
  );
}