import { useMemo, useState } from "react";
import { Copy, TextQuote } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit",
  "voluptate", "velit", "esse", "cillum", "eu", "fugiat", "nulla", "pariatur", "excepteur",
  "sint", "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "donec", "mattis", "mauris", "justo",
  "risus", "tortor", "fringilla", "venenatis", "euismod", "aliquam", "placerat", "nibh",
];

const SENTENCES = [
  "Nam vel risus tincidunt, euismod justo at, sagittis neque.",
  "Nullam a lorem eu arcu pellentesque tincidunt vel at turpis.",
  "Sed posuere, metus nec sodales tincidunt, felis justo dictum dui.",
  "Curabitur ullamcorper, ligula eget elementum rhoncus, nibh lectus scelerisque.",
  "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere.",
];

const FILLER = [
  "fuck it, ship it",
  "move fast and break paywalls",
  "no accounts, no emails, no walls",
  "powered by spite and caffeine",
  "the wall cracked itself, allegedly",
  "zero signups were harmed in the making",
  "unlimited tools, zero logins",
  "built while paywalls slept",
];

const PAYWALL_MODE = [
  "just the paywall text, no filler",
  "some walls, some words",
  "all the filler, all the walls",
];

export function LoremGenerator() {
  const [count, setCount] = useState(3);
  const [unit, setUnit] = useState<"paragraphs" | "sentences" | "words">("paragraphs");
  const [paywall, setPaywall] = useState(0);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    const rng = mulberry32(paywall * 100000 + count * 31 + unit.length);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
    const word = () => WORDS[Math.floor(rng() * WORDS.length)];
    const sentence = () => {
      const n = 6 + Math.floor(rng() * 8);
      const parts: string[] = [];
      for (let i = 0; i < n; i++) parts.push(word());
      const s = parts.join(" ");
      const insert = Math.floor(rng() * 3);
      if (paywall > 0 && insert === 0) {
        const i = Math.floor(rng() * (s.length - 6));
        return `${s.slice(0, i)} [${pick(FILLER)}] ${s.slice(i)}`.replace(/\s+/g, " ").replace(/ \]/g, "]").replace(" ]", "]");
      }
      return s.charAt(0).toUpperCase() + s.slice(1) + ".";
    };
    const paragraph = () => {
      const n = 3 + Math.floor(rng() * 4);
      const sentences: string[] = [];
      for (let i = 0; i < n; i++) {
        sentences.push(Math.random() < 0.2 ? pick(SENTENCES) : sentence());
      }
      return sentences.join(" ");
    };

    if (unit === "paragraphs") {
      return Array.from({ length: count }, paragraph).join("\n\n");
    }
    if (unit === "sentences") {
      return Array.from({ length: count }, sentence).join(" ");
    }
    return Array.from({ length: count }, word).join(" ");
  }, [count, unit, paywall]);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="LOREM-GENERATOR"
      title="The wordsmith."
      tagline="Lorem ipsum with optional attitude. Paragraphs, sentences or words — minted locally in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Settings
            <TextQuote className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["paragraphs", "sentences", "words"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  unit === u ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                {u}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              {unit} — {count}
            </p>
            <input
              type="range"
              min={1}
              max={unit === "words" ? 200 : 20}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-2 w-full accent-yellow"
            />
          </div>
          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Spice — {PAYWALL_MODE[paywall]}
            </p>
            <div className="mt-2 flex gap-2">
              {[0, 1, 2].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPaywall(level)}
                  className={cn(
                    "flex-1 rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                    paywall === level ? "bg-yellow text-ink shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  {level === 0 ? "Clean" : level === 1 ? "Spicy" : "Unhinged"}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            Output is deterministic per settings — same settings, same text.
          </p>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Output
          </h2>
          <textarea
            readOnly
            value={text}
            spellCheck={false}
            className="mt-4 h-80 w-full flex-1 resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              {text.split(/\s+/).length} words · {new Blob([text]).size} B
            </span>
          </div>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Seeded pseudo-random generator — deterministic, offline, in your tab.
      </p>
    </ToolShell>
  );
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}