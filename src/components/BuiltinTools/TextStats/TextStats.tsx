import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "you", "your", "are", "was", "were", "but",
  "not", "all", "can", "have", "has", "had", "from", "they", "them", "their", "there",
  "will", "would", "could", "should", "about", "into", "than", "then", "when", "what",
  "which", "who", "whom", "how", "why", "where", "its", "it's", "our", "out", "off",
  "over", "under", "very", "just", "also", "been", "being", "some", "such", "only",
  "own", "same", "too", "very", "may", "might", "must", "shall", "does", "did", "doing",
  "a", "an", "is", "in", "on", "of", "to", "at", "by", "as", "or", "if", "so", "no", "up",
  "we", "he", "she", "it", "be", "do", "get", "go", "me", "us", "him", "her", "i", "my",
]);

function sentencesCount(s: string): number {
  const m = s.match(/[.!?]+(\s|$)/g);
  return m ? m.length : 0;
}

export function TextStats() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/) : [];
    const chars = text.length;
    const charsNoSpace = text.replace(/\s/g, "").length;
    const lines = text ? text.split("\n").length : 0;
    const paragraphs = text ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;
    const sentences = sentencesCount(text);
    const readingMin = Math.max(1, Math.round(words.length / 200));
    const speakingMin = Math.max(1, Math.round(words.length / 130));
    const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
    const freq = new Map<string, number>();
    for (const w of words) {
      const clean = w.toLowerCase().replace(/[^a-z0-9']/g, "");
      if (clean.length < 3 || STOPWORDS.has(clean)) continue;
      freq.set(clean, (freq.get(clean) ?? 0) + 1);
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const maxFreq = top[0]?.[1] ?? 1;
    return {
      chars,
      charsNoSpace,
      words: words.length,
      lines,
      paragraphs,
      sentences,
      readingMin,
      speakingMin,
      longest,
      top,
      maxFreq,
    };
  }, [text]);

  const rows: [string, string][] = [
    ["Characters", stats.chars.toLocaleString()],
    ["Characters (no spaces)", stats.charsNoSpace.toLocaleString()],
    ["Words", stats.words.toLocaleString()],
    ["Lines", stats.lines.toLocaleString()],
    ["Paragraphs", stats.paragraphs.toLocaleString()],
    ["Sentences", stats.sentences.toLocaleString()],
    ["Reading time", `~${stats.readingMin} min`],
    ["Speaking time", `~${stats.speakingMin} min`],
    ["Longest word", stats.longest || "—"],
  ];

  return (
    <ToolShell
      crumb="TEXT-STATS"
      title="The counter."
      tagline="Words, chars, reading time, top keywords — every number about your text, counted in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Text
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder="Paste or type your text…"
            className="mt-4 h-80 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full border-2 border-ink", text ? "bg-green" : "bg-ink/20")} />
            {text ? "[ OK ] COUNTING" : "[ IDLE ] WAITING FOR TEXT"}
          </p>
        </section>

        <section className="space-y-6">
          <div className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] The numbers
            </h2>
            <ul className="mt-4 space-y-2">
              {rows.map(([label, value]) => (
                <li key={label} className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">{label}</p>
                  <p className="font-mono text-xs font-bold text-ink">{value}</p>
                </li>
              ))}
            </ul>
          </div>

          {stats.top.length > 0 && (
            <div className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [03] Top keywords
              </h2>
              <div className="mt-4 space-y-2">
                {stats.top.map(([word, count]) => (
                  <div key={word} className="flex items-center gap-3">
                    <p className="w-40 truncate font-mono text-xs font-bold text-ink">{word}</p>
                    <div className="h-4 flex-1 overflow-hidden rounded-sm border-2 border-ink bg-surface-muted">
                      <div
                        className="h-full bg-yellow"
                        style={{ width: `${(count / stats.maxFreq) * 100}%` }}
                      />
                    </div>
                    <p className="w-8 text-right font-mono text-xs font-bold text-ink">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Counted locally, stopwords filtered, zero bytes leave the tab.
      </p>
    </ToolShell>
  );
}