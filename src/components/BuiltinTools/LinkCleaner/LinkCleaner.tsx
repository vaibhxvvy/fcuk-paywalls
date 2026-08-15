import { useState } from "react";
import { Copy, Eraser, Link2 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "utm_reader",
  "fbclid", "gclid", "gclsrc", "msclkid", "dclid", "wbraid", "gbraid", "igshid", "igsh",
  "mc_cid", "mc_eid", "mkt_tok", "oly_anon_id", "oly_enc_id", "vero_id", "vero_conv",
  "ref_src", "ref_url", "share_token", "sfmc_id", "s_cid", "cmpid", "campaign_id",
  "affid", "affiliate", "aff_click_id", "click_id", "cid", "partner", "tracking", "spm",
  "sc_cid", "source", "src",
];

const REDIRECT_PARAMS = ["url", "next", "redirect", "redirect_uri", "redirect_to", "return_to", "continue", "dest", "target", "go", "link"];

interface CleanResult {
  url: string;
  removed: string[];
}

function cleanUrl(raw: string): CleanResult {
  const removed: string[] = [];
  let cleaned = raw.trim();
  try {
    const url = new URL(cleaned);
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (TRACKING_PARAMS.includes(lower) || lower.startsWith("utm_")) {
        removed.push(`${key}=${url.searchParams.get(key)}`);
        url.searchParams.delete(key);
      }
    }
    let redirectTarget: string | null = null;
    for (const key of REDIRECT_PARAMS) {
      const value = url.searchParams.get(key);
      if (value) {
        const candidate = new URL(value, url.origin);
        if (candidate.hostname !== url.hostname) {
          redirectTarget = value;
          removed.push(`redirect ${key}=${value}`);
          break;
        }
      }
    }
    cleaned = url.href;
    if (redirectTarget) {
      cleaned = redirectTarget;
      return cleanUrl(cleaned);
    }
  } catch {
    removed.push("NOT A VALID URL");
  }
  return { url: cleaned, removed };
}

export function LinkCleaner() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CleanResult | null>(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    setResult(cleanUrl(input));
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="LINK-CLEANER"
      title="The scrubber."
      tagline="Strip tracking params, follow redirect chains, hand you back a clean URL. Your links, degreased."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Dirty link
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="https://example.com/article?utm_source=newsletter&utm_campaign=launch&fbclid=abc123"
            className="mt-4 h-36 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={run} disabled={!input} className="uppercase">
              Scrub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput("https://example.com/article?utm_source=newsletter&utm_campaign=launch&fbclid=abc123");
                setResult(null);
              }}
              className="uppercase"
            >
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput("");
                setResult(null);
              }}
              className="uppercase"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Clean link
          </h2>
          <div className="mt-4 flex flex-1 flex-col rounded-md border-2 border-ink bg-ink p-3">
            <p className="break-all font-mono text-xs leading-relaxed text-green">
              {result?.url ?? "Scrubbed URL appears here…"}
            </p>
            {result && result.removed.length > 0 && (
              <div className="mt-3 border-t-2 border-paper/15 pt-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/50">
                  Stripped
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto">
                  {result.removed.map((r, i) => (
                    <li key={i} className="break-all font-mono text-[10px] text-red">
                      ✕ {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!result}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                  result ? (result.removed.some((r) => r === "NOT A VALID URL") ? "bg-red" : "bg-green") : "bg-ink/20",
                )}
              />
              {result
                ? result.removed.some((r) => r === "NOT A VALID URL")
                  ? "[ ERR ] THAT IS NOT A URL"
                  : `[ OK ] STRIPPED ${result.removed.length} PARAM${result.removed.length === 1 ? "" : "S"}`
                : "[ IDLE ] WAITING FOR A LINK"}
            </span>
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Everything parsed in the tab — nothing is ever fetched.
      </p>
    </ToolShell>
  );
}