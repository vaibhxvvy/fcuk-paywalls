import { useMemo, useState } from "react";
import { Copy, Pipette } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp255(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

function rgbFromHex(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToCmyk({ r, g, b }: Rgb): { c: number; k: number; m: number; y: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const lum = ({ r, g, b }: Rgb) => {
    const f = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const l1 = lum(a), l2 = lum(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function wcagLevel(ratio: number, isLarge: boolean): "AAA" | "AA" | "FAIL" {
  if (ratio >= 4.5) return "AAA";
  if (ratio >= 3) return isLarge ? "AAA" : "AA";
  if (ratio >= 2) return isLarge ? "AA" : "FAIL";
  return "FAIL";
}

export function ColorLab() {
  const [hex, setHex] = useState("#FFD84D");
  const [fgHex, setFgHex] = useState("#111111");
  const [bgHex, setBgHex] = useState("#F5F0E8");

  const rgb = useMemo(() => rgbFromHex(hex), [hex]);
  const hsl = useMemo(() => (rgb ? rgbToHsl(rgb) : null), [rgb]);
  const cmyk = useMemo(() => (rgb ? rgbToCmyk(rgb) : null), [rgb]);
  const shades = useMemo(() => {
    if (!rgb) return [];
    const list: string[] = [];
    for (let i = -4; i <= 4; i++) {
      const f = i / 10;
      const shade = { r: clamp255(rgb.r + (255 - rgb.r) * Math.max(0, f)), g: clamp255(rgb.g + (255 - rgb.g) * Math.max(0, f)), b: clamp255(rgb.b + (255 - rgb.b) * Math.max(0, f)) };
      if (f < 0) {
        const m = 1 + f * 2;
        list.push(`#${[shade.r, shade.g, shade.b].map((n) => Math.round(n * m).toString(16).padStart(2, "0")).join("")}`);
      } else {
        list.push(`#${[shade.r, shade.g, shade.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`);
      }
    }
    return list;
  }, [rgb]);

  const fgRgb = rgbFromHex(fgHex);
  const bgRgb = rgbFromHex(bgHex);
  const ratio = fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : 0;
  const normal = fgRgb && bgRgb ? wcagLevel(ratio, false) : "FAIL";
  const large = fgRgb && bgRgb ? wcagLevel(ratio, true) : "FAIL";

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <ToolShell
      crumb="COLOR-LAB"
      title="The lab."
      tagline="HEX ⇄ RGB ⇄ HSL ⇄ CMYK, WCAG contrast checks and a shade ladder — all mixed in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The mix
            <Pipette className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="color"
              value={rgb ? `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}` : "#000000"}
              onChange={(e) => setHex(e.target.value.toUpperCase())}
              className="h-12 w-16 cursor-pointer rounded-md border-2 border-ink bg-surface-muted p-1"
              aria-label="Pick a color"
            />
            <input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              spellCheck={false}
              placeholder="#FFD84D"
              className="w-32 rounded-md border-2 border-ink bg-surface-muted p-2 font-mono text-sm font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
            <button
              type="button"
              onClick={() => void copy(hex.toUpperCase())}
              className="rounded-md border-2 border-ink p-2 text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/60"
              aria-label="Copy hex"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {rgb && hsl && cmyk ? (
            <ul className="mt-4 space-y-2">
              {[
                ["HEX", hex.toUpperCase()],
                ["RGB", `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`],
                ["HSL", `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`],
                ["CMYK", `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`],
              ].map(([label, value]) => (
                <li key={label} className="flex items-center justify-between gap-3 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">{label}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs font-bold text-ink">{value}</p>
                    <button
                      type="button"
                      onClick={() => void copy(value)}
                      className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/60"
                      aria-label={`Copy ${label}`}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-md border-2 border-ink bg-red p-3 font-mono text-[11px] font-bold uppercase tracking-widest text-ink">
              [ ERR ] THAT IS NOT A VALID HEX COLOR
            </p>
          )}

          <div className="mt-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
              Shade ladder
            </p>
            <div className="mt-2 grid grid-cols-9 gap-1">
              {shades.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setHex(s.toUpperCase());
                  }}
                  title={s}
                  className="h-10 rounded-sm border-2 border-ink"
                  style={{ backgroundColor: s }}
                  aria-label={`Shade ${s}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Contrast check
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <input
                type="color"
                value={fgHex}
                onChange={(e) => setFgHex(e.target.value.toUpperCase())}
                className="h-8 w-10 cursor-pointer rounded-sm border-2 border-ink bg-surface-muted p-0.5"
                aria-label="Foreground color"
              />
              <input
                value={fgHex}
                onChange={(e) => setFgHex(e.target.value)}
                spellCheck={false}
                className="w-full rounded-sm bg-transparent font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
              />
            </div>
            <div className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <input
                type="color"
                value={bgHex}
                onChange={(e) => setBgHex(e.target.value.toUpperCase())}
                className="h-8 w-10 cursor-pointer rounded-sm border-2 border-ink bg-surface-muted p-0.5"
                aria-label="Background color"
              />
              <input
                value={bgHex}
                onChange={(e) => setBgHex(e.target.value)}
                spellCheck={false}
                className="w-full rounded-sm bg-transparent font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
              />
            </div>
          </div>
          <div
            className="mt-4 flex h-36 items-center justify-center rounded-md border-2 border-ink p-4 text-center font-display text-xl font-bold uppercase"
            style={{ backgroundColor: bgHex, color: fgHex }}
          >
            The quick brown fox
          </div>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Ratio</p>
              <p className={cn("font-mono text-xs font-bold", ratio >= 4.5 ? "text-green" : ratio >= 3 ? "text-yellow" : "text-red")}>
                {ratio.toFixed(2)} : 1
              </p>
            </li>
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Normal text</p>
              <p className={cn("font-mono text-xs font-bold", normal === "FAIL" ? "text-red" : "text-green")}>{normal}</p>
            </li>
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Large text (18px+)</p>
              <p className={cn("font-mono text-xs font-bold", large === "FAIL" ? "text-red" : "text-green")}>{large}</p>
            </li>
          </ul>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        WCAG 2.2 contrast math computed locally. Colours mixed fresh in your tab.
      </p>
    </ToolShell>
  );
}