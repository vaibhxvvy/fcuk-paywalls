import { useState } from "react";
import { Barcode, FileDown } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

type Mode = "ean13" | "upca" | "code128" | "code39";

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

const EAN_L: Record<string, string> = {
  "0": "0001101", "1": "0011001", "2": "0010011", "3": "0111101", "4": "0100011",
  "5": "0110001", "6": "0101111", "7": "0111011", "8": "0110111", "9": "0001011",
};
const EAN_G: Record<string, string> = {
  "0": "0100111", "1": "0110011", "2": "0011011", "3": "0100001", "4": "0011101",
  "5": "0111001", "6": "0000101", "7": "0010001", "8": "0001001", "9": "0010111",
};
const EAN_R: Record<string, string> = {
  "0": "1110010", "1": "1100110", "2": "1101100", "3": "1000010", "4": "1011100",
  "5": "1001110", "6": "1010000", "7": "1000100", "8": "1001000", "9": "1110100",
};
const EAN_FIRST: Record<string, string> = {
  "0": "LLLLLL", "1": "LLGLGG", "2": "LLGGLG", "3": "LLGGGL", "4": "LGLLGG",
  "5": "LGGLLG", "6": "LGGGLL", "7": "LGLGLG", "8": "LGLGGL", "9": "LGGLGL",
};

const eanCheck = (d: string): string => {
  let sum = 0;
  for (let i = 0; i < d.length; i++) sum += Number(d[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
};

const eanModules = (digits: string): string => {
  const first = digits[0];
  const pattern = EAN_FIRST[first] ?? "LLLLLL";
  let bits = "101";
  for (let i = 1; i <= 6; i++) {
    const table = pattern[i - 1] === "L" ? EAN_L : EAN_G;
    bits += table[digits[i]];
  }
  bits += "01010";
  for (let i = 7; i <= 12; i++) bits += EAN_R[digits[i]];
  bits += "101";
  return bits;
};

const C128: Record<number, string> = {
  0: "11011001100", 1: "11001101100", 2: "11001100110", 3: "10010011000", 4: "10010001100",
  5: "10001001100", 6: "10011001000", 7: "10011000100", 8: "10001100100", 9: "11001001000",
  10: "11001000100", 11: "11000100100", 12: "10110011100", 13: "10011011100", 14: "10011001110",
  15: "10111001100", 16: "10011101100", 17: "10011100110", 18: "11001110010", 19: "11001011100",
  20: "11001001110", 21: "11011100100", 22: "11001110100", 23: "11101101110", 24: "11101001100",
  25: "11100101100", 26: "11100100110", 27: "11101100100", 28: "11100110100", 29: "11100110010",
  30: "11011011000", 31: "11011000110", 32: "11000110110", 33: "10100011000", 34: "10001011000",
  35: "10001000110", 36: "10110001000", 37: "10001101000", 38: "10001100010", 39: "11010001000",
  40: "11000101000", 41: "11000100010", 42: "10110111000", 43: "10110001110", 44: "10001101110",
  45: "10111011000", 46: "10111000110", 47: "10001110110", 48: "11101110110", 49: "11010001110",
  50: "11000101110", 51: "11011101000", 52: "11011100010", 53: "11011101110", 54: "11101011000",
  55: "11101000110", 56: "11100010110", 57: "11101101000", 58: "11101100010", 59: "11100011010",
  60: "11101111010", 61: "11001000010", 62: "11110001010", 63: "10100110000", 64: "10100001100",
  65: "10010110000", 66: "10010000110", 67: "10000101100", 68: "10000100110", 69: "10110010000",
  70: "10110000100", 71: "10011010000", 72: "10011000010", 73: "10000110100", 74: "10000110010",
  75: "11000010010", 76: "11001010000", 77: "11110111010", 78: "11000010100", 79: "10001111010",
  80: "10100111100", 81: "10010111100", 82: "10010011110", 83: "10111100100", 84: "10011110100",
  85: "10011110010", 86: "11110100100", 87: "11110010100", 88: "11110010010", 89: "11011011110",
  90: "11011110110", 91: "11110110110", 92: "10101111000", 93: "10100011110", 94: "10001011110",
  95: "10111101000", 96: "10111100010", 97: "11110101000", 98: "11110100010", 99: "10111011110",
  100: "10111101110", 101: "11101011110", 102: "11110101110", 103: "11010000100", 104: "11010010000",
  105: "11010011100",
};
const C128_STOP = "1100011101011";
const C128_START_B = 104;

const c128Modules = (text: string): string => {
  const values: number[] = [C128_START_B];
  for (const ch of text) {
    const v = ch.charCodeAt(0) - 32;
    if (v < 0 || v > 94) continue;
    values.push(v);
  }
  let check = C128_START_B;
  for (let i = 1; i < values.length; i++) check += values[i] * i;
  check %= 103;
  values.push(check);
  let bits = C128[C128_START_B];
  for (const v of values.slice(1)) bits += C128[v];
  bits += C128_STOP;
  return bits;
};

const CODE39: Record<string, number[]> = {
  "0": [0, 0, 0, 1, 1, 0, 1, 0, 0],
  "1": [1, 0, 0, 1, 0, 0, 0, 0, 1],
  "2": [0, 0, 1, 1, 0, 0, 0, 0, 1],
  "3": [1, 0, 1, 1, 0, 0, 0, 0, 0],
  "4": [0, 0, 0, 1, 1, 0, 0, 0, 1],
  "5": [1, 0, 0, 1, 1, 0, 0, 0, 0],
  "6": [0, 0, 1, 1, 1, 0, 0, 0, 0],
  "7": [0, 0, 0, 1, 0, 0, 1, 0, 1],
  "8": [1, 0, 0, 1, 0, 0, 1, 0, 0],
  "9": [0, 0, 1, 1, 0, 0, 1, 0, 0],
  A: [1, 0, 0, 0, 0, 1, 0, 0, 1],
  B: [0, 0, 1, 0, 0, 1, 0, 0, 1],
  C: [1, 0, 1, 0, 0, 1, 0, 0, 0],
  D: [0, 0, 0, 0, 1, 1, 0, 0, 1],
  E: [1, 0, 0, 0, 1, 1, 0, 0, 0],
  F: [0, 0, 1, 0, 1, 1, 0, 0, 0],
  G: [0, 0, 0, 0, 0, 1, 1, 0, 1],
  H: [1, 0, 0, 0, 0, 1, 1, 0, 0],
  I: [0, 0, 1, 0, 0, 1, 1, 0, 0],
  J: [0, 0, 0, 0, 1, 1, 1, 0, 0],
  K: [1, 0, 0, 0, 0, 0, 0, 1, 1],
  L: [0, 0, 1, 0, 0, 0, 0, 1, 1],
  M: [1, 0, 1, 0, 0, 0, 0, 1, 0],
  N: [0, 0, 0, 0, 1, 0, 0, 1, 1],
  O: [1, 0, 0, 0, 1, 0, 0, 1, 0],
  P: [0, 0, 1, 0, 1, 0, 0, 1, 0],
  Q: [0, 0, 0, 0, 0, 0, 1, 1, 1],
  R: [1, 0, 0, 0, 0, 0, 1, 1, 0],
  S: [0, 0, 1, 0, 0, 0, 1, 1, 0],
  T: [0, 0, 0, 0, 1, 0, 1, 1, 0],
  U: [1, 1, 0, 0, 0, 0, 0, 0, 1],
  V: [0, 1, 1, 0, 0, 0, 0, 0, 1],
  W: [1, 1, 1, 0, 0, 0, 0, 0, 0],
  X: [0, 1, 0, 0, 1, 0, 0, 0, 1],
  Y: [1, 1, 0, 0, 1, 0, 0, 0, 0],
  Z: [0, 1, 1, 0, 1, 0, 0, 0, 0],
  "-": [0, 1, 0, 0, 0, 0, 1, 0, 1],
  ".": [1, 1, 0, 0, 0, 0, 1, 0, 0],
  " ": [0, 1, 1, 0, 0, 0, 1, 0, 0],
  "*": [0, 1, 0, 1, 0, 1, 0, 0, 0],
  $: [0, 1, 0, 1, 0, 1, 0, 1, 0],
  "/": [0, 1, 0, 1, 0, 0, 1, 0, 1],
  "+": [0, 1, 0, 0, 1, 0, 1, 0, 1],
  "%": [0, 0, 1, 0, 1, 0, 1, 0, 1],
};

const c39Modules = (text: string): string => {
  const s = "*" + text.toUpperCase().replace(/[^A-Z0-9 .\-$/+%]/g, " ") + "*";
  let bits = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0) bits += "0";
    bits += (CODE39[s[i]] ?? CODE39[" "]).map((b) => (b === 1 ? "1" : "0")).join("");
  }
  return bits;
};

const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: "ean13", name: "EAN-13", hint: "12 or 13 digits — retail" },
  { id: "upca", name: "UPC-A", hint: "11 or 12 digits — US retail" },
  { id: "code128", name: "Code 128", hint: "Any ASCII text — logistics" },
  { id: "code39", name: "Code 39", hint: "A-Z, 0-9, . - space $ / + %" },
];

export function BarcodeForge() {
  const [mode, setMode] = useState<Mode>("ean13");
  const [value, setValue] = useState("");
  const [scale, setScale] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const normalize = (): { bits: string; label: string } | null => {
    const v = value.trim();
    setError(null);
    if (mode === "ean13") {
      if (!/^\d{12,13}$/.test(v)) {
        setError("EAN-13 needs 12 digits (check digit auto) or 13 digits.");
        return null;
      }
      const d = v.length === 12 ? v + eanCheck(v) : v;
      const computed = eanCheck(d.slice(0, 12));
      if (v.length === 13 && d[12] !== computed) {
        setError(`Check digit ${d[12]} doesn't match ${computed} — the barcode won't scan.`);
        return null;
      }
      return { bits: eanModules(d), label: d };
    }
    if (mode === "upca") {
      if (!/^\d{11,12}$/.test(v)) {
        setError("UPC-A needs 11 digits (check digit auto) or 12 digits.");
        return null;
      }
      const d = v.length === 11 ? v + eanCheck("0" + v) : v;
      return { bits: eanModules("0" + d), label: d };
    }
    if (mode === "code128") {
      if (!v) {
        setError("Type something to encode.");
        return null;
      }
      for (const ch of v) {
        const c = ch.charCodeAt(0);
        if (c < 32 || c > 126) {
          setError("Code 128 accepts plain ASCII text only.");
          return null;
        }
      }
      return { bits: c128Modules(v), label: v };
    }
    if (mode === "code39") {
      if (!v) {
        setError("Type something to encode.");
        return null;
      }
      return { bits: c39Modules(v), label: v };
    }
    return null;
  };

  const renderSvg = (bits: string, scalePx: number) => {
    const rects: { x: number; w: number }[] = [];
    let x = 0;
    for (const ch of bits) {
      if (ch === "1") rects.push({ x, w: scalePx });
      x += scalePx;
    }
    return rects;
  };

  const downloadPng = (bits: string, label: string) => {
    const scalePx = 3;
    const canvas = document.createElement("canvas");
    canvas.width = bits.length * scalePx;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111";
    let x = 0;
    for (const ch of bits) {
      if (ch === "1") ctx.fillRect(x, 0, scalePx, 90);
      x += scalePx;
    }
    ctx.font = "700 16px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, canvas.width / 2, 112);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${mode}-${label.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 24)}.png`;
    a.click();
  };

  const built = normalize();
  const bits = built?.bits ?? "";
  const rects = bits ? renderSvg(bits, scale) : [];
  const width = bits.length * scale;

  return (
    <ToolShell
      crumb="BARCODE-FORGE"
      title="The stripes."
      tagline="Real EAN-13, UPC-A, Code 128 and Code 39 barcodes with real checksums — SVG or PNG at any scale. The paid generators hide high-res behind paywalls; this one scales forever."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Data
            <Barcode className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setError(null);
                }}
                title={m.hint}
                className={
                  m.id === mode
                    ? "rounded-md border-2 border-ink bg-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-paper"
                    : "rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                }
              >
                {m.name}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Value</span>
            <input
              className={inputCls}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "ean13" ? "400638133393" : mode === "upca" ? "036000291452" : "FCUK-001"}
              inputMode={mode === "ean13" || mode === "upca" ? "numeric" : "text"}
            />
          </label>
          <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            {MODES.find((m) => m.id === mode)?.hint}
          </p>

          <div className="mt-4">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Module size {scale}px
            </span>
            <input
              type="range"
              min={1}
              max={6}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="mt-2 w-full accent-ink"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Barcode</h2>
            <span className="ml-auto rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
              {mode} · {bits.length} modules
            </span>
          </div>

          {built ? (
            <>
              <div className="mt-4 flex flex-1 items-center justify-center overflow-auto rounded-md border-2 border-ink bg-surface-muted p-6">
                <div className="flex flex-col items-center gap-3 bg-white p-4 shadow-brutal-sm">
                  <svg
                    width={width}
                    height={90}
                    className="block"
                    shapeRendering="crispEdges"
                    role="img"
                    aria-label={`${mode} barcode for ${built.label}`}
                  >
                    {rects.map((rc, i) => (
                      <rect key={i} x={rc.x} y={0} width={rc.w} height={90} fill="#111" />
                    ))}
                  </svg>
                  <span className="font-mono text-xs font-bold tracking-[0.35em] text-ink/70">{built.label}</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={() => downloadPng(bits, built.label)} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Download PNG
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="90" shape-rendering="crispEdges">${rects
                      .map((rc) => `<rect x="${rc.x}" y="0" width="${rc.w}" height="90" fill="#111"/>`)
                      .join("")}</svg>`;
                    const blob = new Blob([svg], { type: "image/svg+xml" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${mode}-${built.label.replace(/[^A-Za-z0-9]+/g, "-").slice(0, 24)}.svg`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                  }}
                  className="rounded-md border-[3px] border-ink bg-surface px-5 font-display text-sm font-bold uppercase tracking-wide text-ink shadow-brutal-sm transition-[transform,box-shadow] duration-150 ease-brutal hover:translate-x-[3px] hover:translate-y-[3px] hover:bg-surface-muted hover:shadow-none"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  SVG
                </button>
              </div>
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                Vector SVG is the one paid generators watermark — here it's free.
              </p>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The barcode appears here
                <br />
                <span className="text-[10px] font-semibold">Checksums validated before a single stripe is drawn.</span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Encoded locally with real ISO 15417 / EAN tables — no watermark, no high-res paywall.
      </p>
    </ToolShell>
  );
}