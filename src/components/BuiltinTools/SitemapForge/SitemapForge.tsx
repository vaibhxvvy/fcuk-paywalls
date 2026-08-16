import { useMemo, useState } from "react";
import { Copy, Download, Map, Sparkles } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const SAMPLE_PATHS = "/\n/about\n/contact\n/blog\n/blog/first-post\n/privacy";

const FREQS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const;

const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function SitemapForge() {
  const [base, setBase] = useState("https://example.com");
  const [paths, setPaths] = useState("/\n/about\n/contact");
  const [freq, setFreq] = useState<(typeof FREQS)[number]>("weekly");
  const [priority, setPriority] = useState(0.8);
  const [withLastmod, setWithLastmod] = useState(true);
  const [lastmod, setLastmod] = useState(() => new Date().toISOString().slice(0, 10));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const xml = useMemo(() => {
    setError(null);
    const b = base.trim().replace(/\/+$/, "");
    if (!/^https?:\/\/[^\s]+$/i.test(b)) {
      setError("The base URL must start with http:// or https://");
      return "";
    }
    const lines = paths
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      setError("Add at least one path — one per line.");
      return "";
    }
    const urls = lines.map((l) => {
      if (/^https?:\/\//i.test(l)) return l;
      return `${b}/${l.replace(/^\/+/, "")}`;
    });
    const rows = urls
      .map((u) => {
        const lc = withLastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
        return `  <url>
    <loc>${escXml(u)}</loc>${lc}
    <changefreq>${freq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
      })
      .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
  }, [base, paths, freq, priority, withLastmod, lastmod]);

  const copy = async () => {
    if (!xml) return;
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!xml) return;
    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <ToolShell
      crumb="SITEMAP-FORGE"
      title="The map."
      tagline="Type your site's paths, get a standards-clean sitemap.xml — lastmod, frequency, priority. The XML-sitemap sites charge for the premium tier and put your free output on their CDN first."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Your site
            <Map className="h-4 w-4" aria-hidden="true" />
          </h2>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Base URL
            </span>
            <input
              type="url"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder="https://example.com"
              className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Paths — one per line
            </span>
            <textarea
              value={paths}
              onChange={(e) => setPaths(e.target.value)}
              spellCheck={false}
              placeholder={"/\n/about\n/blog"}
              className="mt-2 h-56 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          </label>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPaths(SAMPLE_PATHS)}
              className="uppercase"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Sample
            </Button>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              Full URLs work too — they're used as-is
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Change frequency
              </span>
              <select
                value={freq}
                onChange={(e) => setFreq(e.target.value as (typeof FREQS)[number])}
                className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
              >
                {FREQS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Priority — {priority.toFixed(1)}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="mt-4 w-full accent-ink"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={withLastmod}
              onChange={(e) => setWithLastmod(e.target.checked)}
              className="h-4 w-4 accent-ink"
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Include lastmod
            </span>
            {withLastmod && (
              <input
                type="date"
                value={lastmod}
                onChange={(e) => setLastmod(e.target.value)}
                className="ml-auto rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
              />
            )}
          </label>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] XML out</h2>
          <pre className="mt-4 h-80 flex-1 overflow-auto rounded-md border-2 border-ink bg-paper p-4 font-mono text-[11px] leading-relaxed text-ink">
            {xml || (
              <span className="text-ink/30">// The sitemap appears here — fix the base URL or add a path.</span>
            )}
          </pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={download} disabled={!xml} className="uppercase">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download sitemap.xml
            </Button>
            <Button variant="secondary" onClick={() => void copy()} disabled={!xml} className="uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy XML"}
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
            {xml ? `[ OK ] ${xml.length.toLocaleString()} BYTES — ${(xml.match(/<url>/g) ?? []).length} URLS` : "[ IDLE ]"}
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Google only needs the XML, never your account — sitemaps are a text file, and now it's yours.
      </p>
    </ToolShell>
  );
}