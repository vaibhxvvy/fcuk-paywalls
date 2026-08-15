import { useCallback, useState } from "react";
import { Copy, Fingerprint, KeyRound, Sparkles } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const CHARSETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/",
};

function uuidV4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function makePassword(length: number, opts: { upper: boolean; lower: boolean; digits: boolean; symbols: boolean }): string {
  const pool =
    (opts.upper ? CHARSETS.upper : "") +
    (opts.lower ? CHARSETS.lower : "") +
    (opts.digits ? CHARSETS.digits : "") +
    (opts.symbols ? CHARSETS.symbols : "");
  const chars = new Uint8Array(length);
  crypto.getRandomValues(chars);
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(pool[chars[i] % pool.length]);
  }
  return out.join("");
}

export function IdForge() {
  const [uuidCount, setUuidCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [pwLength, setPwLength] = useState(20);
  const [pwOpts, setPwOpts] = useState({ upper: true, lower: true, digits: true, symbols: true });
  const [pwCount, setPwCount] = useState(3);
  const [passwords, setPasswords] = useState<string[]>([]);
  const [copied, setCopied] = useState<"uuid" | "pw" | null>(null);

  const poolSize =
    (pwOpts.upper ? 26 : 0) + (pwOpts.lower ? 26 : 0) + (pwOpts.digits ? 10 : 0) + (pwOpts.symbols ? CHARSETS.symbols.length : 0);
  const entropy = poolSize > 0 ? Math.round(pwLength * Math.log2(poolSize)) : 0;

  const copy = useCallback(async (kind: "uuid" | "pw", values: string[]) => {
    await navigator.clipboard.writeText(values.join("\n"));
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const genUuids = () => {
    setUuids(Array.from({ length: uuidCount }, uuidV4));
  };

  const genPasswords = () => {
    if (poolSize === 0) return;
    setPasswords(Array.from({ length: pwCount }, () => makePassword(pwLength, pwOpts)));
  };

  const toggleOpt = (key: keyof typeof pwOpts) => {
    setPwOpts((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  return (
    <ToolShell
      crumb="ID-FORGE"
      title="The forge."
      tagline="UUIDs, passwords, secrets — minted locally with real cryptographic randomness. Nothing ever leaves the tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] UUIDs
            <Fingerprint className="h-4 w-4" aria-hidden="true" />
          </h2>
          <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            UUID v4 — 122 bits of crypto randomness
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={50}
              value={uuidCount}
              onChange={(e) => setUuidCount(Number(e.target.value))}
              className="flex-1 accent-yellow"
            />
            <span className="w-10 text-right font-mono text-xs font-bold text-ink">{uuidCount}</span>
          </div>
          <Button size="sm" onClick={genUuids} className="mt-3 uppercase">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Mint UUIDs
          </Button>
          {uuids.length > 0 && (
            <>
              <div className="mt-3 max-h-56 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
                {uuids.map((u, i) => (
                  <p key={i} className="break-all font-mono text-xs text-ink">
                    {u}
                  </p>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copy("uuid", uuids)}
                className="mt-3 uppercase"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied === "uuid" ? "Copied" : "Copy all"}
              </Button>
            </>
          )}
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Passwords
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </h2>
          <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
            Length {pwLength} · ~{entropy.toLocaleString()} bits of entropy
          </p>
          <input
            type="range"
            min={8}
            max={40}
            value={pwLength}
            onChange={(e) => setPwLength(Number(e.target.value))}
            className="mt-3 w-full accent-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["upper", "A-Z"],
                ["lower", "a-z"],
                ["digits", "0-9"],
                ["symbols", "#$!"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleOpt(key)}
                aria-pressed={pwOpts[key]}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  pwOpts[key] ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={20}
              value={pwCount}
              onChange={(e) => setPwCount(Number(e.target.value))}
              className="flex-1 accent-yellow"
            />
            <span className="w-10 text-right font-mono text-xs font-bold text-ink">{pwCount}</span>
          </div>
          <Button size="sm" onClick={genPasswords} className="mt-3 uppercase" disabled={poolSize === 0}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Forge passwords
          </Button>
          {passwords.length > 0 && (
            <>
              <div className="mt-3 max-h-56 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
                {passwords.map((p, i) => (
                  <p key={i} className="break-all font-mono text-xs text-ink">
                    {p}
                  </p>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void copy("pw", passwords)}
                className="mt-3 uppercase"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied === "pw" ? "Copied" : "Copy all"}
              </Button>
            </>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        crypto.getRandomValues — the browser&apos;s own cryptographic randomness. Your keys, your tab.
      </p>
    </ToolShell>
  );
}