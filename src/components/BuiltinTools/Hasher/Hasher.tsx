import { useState } from "react";
import { Eraser, Hash } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type Algo = "SHA-256" | "SHA-512" | "SHA-1" | "MD5";
const ALL_ALGOS: Algo[] = ["SHA-256", "SHA-512", "SHA-1", "MD5"];

const HEX_CHARS = "0123456789abcdef";

function md5(message: Uint8Array): string {
  const k = new Uint32Array(64);
  const r = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);

  let bitLen = message.length * 8;
  const padded = new Uint8Array(((message.length + 8) >>> 6 << 6) + 64);
  padded.set(message);
  padded[message.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let off = 0; off < padded.length; off += 64) {
    const m = new Uint32Array(16);
    for (let i = 0; i < 16; i++) m[i] = dv.getUint32(off + i * 4, true);
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const tmp = d;
      d = c;
      c = b;
      b = (b + ((a + f + k[i] + m[g]) << r[i] | (a + f + k[i] + m[g]) >>> (32 - r[i]))) >>> 0;
      a = tmp;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const toHex = (n: number) => {
    let out = "";
    for (let i = 0; i < 4; i++) {
      out += HEX_CHARS[(n >> (i * 8 + 4)) & 0xf] + HEX_CHARS[(n >> (i * 8)) & 0xf];
    }
    return out;
  };
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

export function Hasher() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState<Algo>("SHA-256");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const results: Record<Algo, string | null> = {
    "SHA-256": null,
    "SHA-512": null,
    "SHA-1": null,
    MD5: null,
  };

  const run = async () => {
    if (!input || busy) return;
    setBusy(true);
    try {
      const bytes = new TextEncoder().encode(input);
      const [sha256, sha512, sha1, m] = await Promise.all([
        crypto.subtle.digest("SHA-256", bytes),
        crypto.subtle.digest("SHA-512", bytes),
        crypto.subtle.digest("SHA-1", bytes),
        Promise.resolve(md5(bytes)),
      ]);
      const toHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
      results["SHA-256"] = toHex(sha256);
      results["SHA-512"] = toHex(sha512);
      results["SHA-1"] = toHex(sha1);
      results.MD5 = m;
      setResults({ ...results });
    } catch (e) {
      setResults({ "SHA-256": null, "SHA-512": null, "SHA-1": null, MD5: `ERROR: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const [displayResults, setResults] = useState<Record<Algo, string | null>>(results);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(text.slice(0, 8));
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <ToolShell
      crumb="HASHER"
      title="The digester."
      tagline="Hash any text with SHA-256, SHA-512, SHA-1 and MD5 at once. Web Crypto for the big three, in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Input
            <Hash className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Text to digest…"
            className="mt-4 h-56 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void run()} disabled={!input || busy} className="uppercase">
              <Hash className="h-4 w-4" aria-hidden="true" />
              {busy ? "Digesting…" : "Hash it"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setInput(""); setResults(results); }} className="uppercase">
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Focus on
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_ALGOS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlgo(a)}
                  className={cn(
                    "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                    algo === a ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Digests
          </h2>
          <div className="mt-4 flex-1 space-y-3 overflow-auto rounded-md border-2 border-ink bg-ink p-3">
            {ALL_ALGOS.map((a) => {
              const value = displayResults[a];
              const highlighted = a === algo;
              return (
                <div key={a}>
                  <div className="flex items-center justify-between">
                    <p className={cn("font-mono text-[11px] font-bold uppercase tracking-widest", highlighted ? "text-yellow" : "text-paper/50")}>
                      {a}
                    </p>
                    {value && !value.startsWith("ERROR") && (
                      <button
                        type="button"
                        onClick={() => void copy(value)}
                        className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/40 transition-colors hover:text-yellow"
                      >
                        {copied === value.slice(0, 8) ? "COPIED" : "COPY"}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-green">
                    {value ?? "— waiting for input —"}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full border-2 border-ink", busy ? "animate-pulse bg-yellow" : "bg-green")} />
            {busy ? "[ DIGESTING ]" : input ? "[ OK ] ALL FOUR READY" : "[ IDLE ] WAITING FOR INPUT"}
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        SHA via Web Crypto, MD5 via a local implementation (legacy only — don&apos;t rely on it for security).
      </p>
    </ToolShell>
  );
}