import { useMemo, useState } from "react";
import { Binary, Copy, Eraser, RotateCcw } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type Encoding = "utf8" | "base64" | "hex" | "url" | "base64url";

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length % 2 !== 0) throw new Error("odd hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const DECODE_ERRORS: Record<string, string> = {
  utf8: "NOT VALID UTF-8",
  base64: "INVALID BASE64 — CHECK PADDING",
  base64url: "INVALID BASE64URL",
  hex: "INVALID HEX — ONLY 0-9 A-F",
  url: "INVALID URL-ENCODING",
};

function decodeToUtf8(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return decodeURIComponent(escape(out));
}

export function Base64Machine() {
  const [input, setInput] = useState("");
  const [encoding, setEncoding] = useState<Encoding>("utf8");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    try {
      if (mode === "encode") {
        const bytes = new TextEncoder().encode(input);
        const result =
          encoding === "base64"
            ? bytesToBase64(bytes)
            : encoding === "base64url"
              ? bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
              : encoding === "hex"
                ? Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
                : encodeURIComponent(input);
        return { value: result, error: null as string | null };
      }
      let bytes: Uint8Array;
      if (encoding === "base64") bytes = base64ToBytes(input.trim().replace(/\s+/g, ""));
      else if (encoding === "base64url") {
        const padded = input.trim().replace(/-/g, "+").replace(/_/g, "/");
        bytes = base64ToBytes(padded + "=".repeat((4 - (padded.length % 4)) % 4));
      } else if (encoding === "hex") bytes = hexToBytes(input);
      else if (encoding === "url") bytes = new TextEncoder().encode(decodeURIComponent(input));
      else bytes = new TextEncoder().encode(input);
      return { value: decodeToUtf8(bytes), error: null };
    } catch (e) {
      const msg = DECODE_ERRORS[encoding] ?? (e as Error).message;
      return { value: "", error: msg };
    }
  }, [input, encoding, mode]);

  const info = useMemo(() => {
    if (!input || !output.value) return null;
    const inBytes = new TextEncoder().encode(input).length;
    return { inBytes, outBytes: new Blob([output.value]).size };
  }, [input, output]);

  const copy = async () => {
    if (!output.value) return;
    await navigator.clipboard.writeText(output.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="BASE64-MACHINE"
      title="The machine."
      tagline="Encode and decode between UTF-8, Base64, Base64URL, hex and URL-encoding. All of it, in your tab."
    >
      <div className="mt-10 flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          {(
            [
              ["encode", "Encode"],
              ["decode", "Decode"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                mode === value ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {(["utf8", "base64", "base64url", "hex", "url"] as Encoding[]).map((enc) => (
            <button
              key={enc}
              type="button"
              onClick={() => setEncoding(enc)}
              className={cn(
                "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                encoding === enc ? "bg-yellow text-ink shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
              )}
            >
              {enc}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] {mode === "encode" ? "Plain input" : "Encoded input"}
            <Binary className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={mode === "encode" ? "Text to encode…" : "Encoded string to decode…"}
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("FCUK PAYWALLS — beep boop")}
              className="uppercase"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("")}
              className="uppercase"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] {mode === "encode" ? "Encoded output" : "Decoded output"}
          </h2>
          <textarea
            readOnly
            value={output.value}
            spellCheck={false}
            placeholder="Result lands here…"
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!output.value}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                  output.error ? "bg-red" : output.value ? "bg-green" : "bg-ink/20",
                )}
              />
              {output.error
                ? `[ ERR ] ${output.error}`
                : info
                  ? `[ OK ] ${info.inBytes}B → ${info.outBytes}B`
                  : "[ IDLE ] WAITING FOR INPUT"}
            </span>
          </div>
        </section>
      </div>

      {output.error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          [ ERR ] {output.error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Pure in-browser conversion — no payloads leave your tab. Not a network in sight.
      </p>
    </ToolShell>
  );
}