import { useEffect, useMemo, useState } from "react";
import { Copy, Type } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

interface FontPair {
  name: string;
  headline: { family: string; css: string };
  body: { family: string; css: string };
}

const PAIRS: FontPair[] = [
  {
    name: "Brutalist",
    headline: { family: "Space Grotesk", css: "Space+Grotesk:wght@500;700" },
    body: { family: "Inter", css: "Inter:wght@400;500" },
  },
  {
    name: "Poster",
    headline: { family: "Archivo Black", css: "Archivo+Black" },
    body: { family: "IBM Plex Mono", css: "IBM+Plex+Mono:wght@400;600" },
  },
  {
    name: "Editorial",
    headline: { family: "Playfair Display", css: "Playfair+Display:wght@600;800" },
    body: { family: "Source Sans 3", css: "Source+Sans+3:wght@400;600" },
  },
  {
    name: "Tech",
    headline: { family: "Chakra Petch", css: "Chakra+Petch:wght@600;700" },
    body: { family: "JetBrains Mono", css: "JetBrains+Mono:wght@400;500" },
  },
  {
    name: "Friendly",
    headline: { family: "Baloo 2", css: "Baloo+2:wght@600;800" },
    body: { family: "Nunito Sans", css: "Nunito+Sans:wght@400;600" },
  },
  {
    name: "Newspaper",
    headline: { family: "Libre Franklin", css: "Libre+Franklin:wght@700;900" },
    body: { family: "Libre Baskerville", css: "Libre+Baskerville:wght@400;700" },
  },
  {
    name: "Grunge",
    headline: { family: "Bebas Neue", css: "Bebas+Neue" },
    body: { family: "Archivo", css: "Archivo:wght@400;600" },
  },
  {
    name: "Modern",
    headline: { family: "Sora", css: "Sora:wght@600;800" },
    body: { family: "Manrope", css: "Manrope:wght@400;600" },
  },
];

const HEADLINE_TEXT = "NO MORE WALLS";
const BODY_TEXT =
  "This is a live preview of a headline and body pairing. Type in your own copy and see it set in real fonts — loaded right in your tab.";

export function FontPairs() {
  const [index, setIndex] = useState(0);
  const [headline, setHeadline] = useState(HEADLINE_TEXT);
  const [body, setBody] = useState(BODY_TEXT);
  const [copied, setCopied] = useState(false);
  const pair = PAIRS[index];

  useEffect(() => {
    const css = [pair.headline.css, pair.body.css].join("&family=");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${css}&display=swap`;
    link.id = "font-pair-preview";
    document.head.appendChild(link);
    return () => {
      const old = document.getElementById("font-pair-preview");
      if (old) old.remove();
    };
  }, [index, pair]);

  const cssOut = useMemo(
    () => `.font-headline { font-family: '${pair.headline.family}', sans-serif; }\n.font-body { font-family: '${pair.body.family}', sans-serif; }`,
    [pair],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(cssOut);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="FONT-PAIRS"
      title="The matchmaker."
      tagline="Preview curated headline + body font pairings with your own copy. Steal the CSS, ship the design."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Pairings
            <Type className="h-4 w-4" aria-hidden="true" />
          </h2>
          <ul className="mt-4 space-y-2">
            {PAIRS.map((p, i) => (
              <li key={p.name}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border-2 border-ink px-3 py-2 text-left transition-[background-color,box-shadow] duration-200 ease-brutal",
                    index === i ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-widest">{p.name}</span>
                  <span className={cn("font-mono text-[10px] uppercase tracking-widest", index === i ? "text-yellow" : "text-ink/40")}>
                    {p.headline.family} + {p.body.family}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Live preview
          </h2>
          <div className="mt-4 rounded-md border-2 border-ink bg-paper p-6">
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              spellCheck={false}
              rows={1}
              className="w-full resize-none bg-transparent font-bold uppercase leading-none tracking-tight text-ink outline-none placeholder:text-ink/30"
              style={{ fontFamily: `'${pair.headline.family}', sans-serif`, fontSize: "clamp(1.8rem, 4vw, 3rem)" }}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              rows={4}
              className="mt-4 w-full resize-none bg-transparent text-sm leading-relaxed text-ink/80 outline-none placeholder:text-ink/30"
              style={{ fontFamily: `'${pair.body.family}', sans-serif` }}
            />
          </div>
          <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Copy to clipboard</p>
            <pre className="mt-2 overflow-auto font-mono text-[11px] text-ink">{cssOut}</pre>
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => void copy()} className="uppercase">
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy CSS"}
              </Button>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
                Plus @import for both families — in the CSS tab of your devtools
              </p>
            </div>
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Fonts are fetched from Google Fonts, previewed live, and the CSS is copied — nothing else leaves.
      </p>
    </ToolShell>
  );
}