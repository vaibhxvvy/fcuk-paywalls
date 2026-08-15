import { useMemo, useRef, useState } from "react";
import { Brush, Copy, Download, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type CharsetId = "classic" | "fine" | "blocky" | "numbers" | "dots" | "custom";
type BgMode = "black" | "paper";

interface Charset {
  id: CharsetId;
  name: string;
  chars: string;
}

const CHARSETS: Charset[] = [
  { id: "classic", name: "Classic", chars: "@%#*+=-:. " },
  { id: "fine", name: "Fine", chars: "@%#WM*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,." },
  { id: "blocky", name: "Blocky", chars: "█▓▒░ " },
  { id: "numbers", name: "Numbers", chars: "9876543210 " },
  { id: "dots", name: "Dots", chars: "●◉◐◕○· " },
  { id: "custom", name: "Custom", chars: "@%#*+=-:. " },
];

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const ESC = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface Img {
  url: string;
  w: number;
  h: number;
  el: HTMLImageElement;
}

interface RenderResult {
  text: string;
  ansi: string;
  html: string;
  svg: string;
  pngUrl: string;
  rows: number;
  cols: number;
}

export function AsciiArtist() {
  const [img, setImg] = useState<Img | null>(null);
  const [width, setWidth] = useState(80);
  const [charsetId, setCharsetId] = useState<CharsetId>("classic");
  const [customChars, setCustomChars] = useState("@%#*+=-:. ");
  const [half, setHalf] = useState(false);
  const [invert, setInvert] = useState(false);
  const [dither, setDither] = useState(true);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(100);
  const [colored, setColored] = useState(false);
  const [bg, setBg] = useState<BgMode>("black");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const charset = useMemo(() => {
    const c = CHARSETS.find((c) => c.id === charsetId) ?? CHARSETS[0];
    if (c.id === "custom") {
      const cleaned = customChars.trim();
      return { ...c, chars: cleaned.length > 0 ? cleaned : CHARSETS[0].chars };
    }
    return c;
  }, [charsetId, customChars]);

  const result = useMemo<RenderResult | null>(() => {
    if (!img) return null;
    const cols = width;
    const cellRows = half ? 2 : 1;
    const rows = Math.max(1, Math.round((img.h / img.w) * cols * 0.5));
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows * cellRows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.el, 0, 0, cols, rows * cellRows);
    const data = ctx.getImageData(0, 0, cols, rows * cellRows).data;

    const levels = charset.chars.length;
    const cellW = 7.2;
    const cellH = 14;
    const mono = bg === "black" ? "#65D68A" : "#111111";
    const bgColor = bg === "black" ? "#111111" : "#F5F0E8";

    const textLines: string[] = [];
    const ansiLines: string[] = [];
    const htmlLines: string[] = [];
    const svgParts: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cellW}" height="${rows * cellH}" viewBox="0 0 ${cols * cellW} ${rows * cellH}">`, `<rect width="100%" height="100%" fill="${bgColor}"/>`];
    const pngCanvas = document.createElement("canvas");
    pngCanvas.width = Math.round(cols * cellW);
    pngCanvas.height = Math.round(rows * cellH);
    const pctx = pngCanvas.getContext("2d");
    if (!pctx) return null;
    pctx.fillStyle = bgColor;
    pctx.fillRect(0, 0, pngCanvas.width, pngCanvas.height);
    pctx.font = "12px 'IBM Plex Mono', monospace";
    pctx.textBaseline = "middle";

    const sampleAt = (x: number, y: number) => {
      const i = (y * cols + x) * 4;
      return { r: data[i], g: data[i + 1], b: data[i + 2] };
    };
    const lumOf = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
    const adjust = (lum: number) => {
      let l = (lum - 128) * (contrast / 100) + 128 + brightness;
      return Math.min(255, Math.max(0, l));
    };
    const charFor = (lum: number, x: number, y: number) => {
      let l = lum;
      if (dither) l += (BAYER4[y % 4][x % 4] / 16 - 0.5) * (255 / levels);
      l = invert ? 255 - l : l;
      const idx = Math.round((l / 255) * (levels - 1));
      return charset.chars[Math.min(levels - 1, Math.max(0, idx))];
    };

    for (let y = 0; y < rows; y++) {
      let textRow = "";
      let ansiRow = "";
      let htmlRow = "";
      for (let x = 0; x < cols; x++) {
        if (half) {
          const top = sampleAt(x, y * 2);
          const bot = sampleAt(x, y * 2 + 1);
          const lt = adjust(lumOf(top.r, top.g, top.b));
          const lb = adjust(lumOf(bot.r, bot.g, bot.b));
          const tDark = invert ? lt > 128 : lt < 128;
          const bDark = invert ? lb > 128 : lb < 128;
          const ch = tDark && bDark ? "█" : tDark ? "▀" : bDark ? "▄" : " ";
          textRow += ch;
          if (colored) {
            const ansiTop = `\x1b[38;2;${top.r};${top.g};${top.b}m${ch}`;
            ansiRow += `${ansiTop}\x1b[0m`;
            htmlRow += `<span style="color:rgb(${top.r},${top.g},${top.b})">${ESC(ch)}</span>`;
            svgParts.push(`<rect x="${x * cellW}" y="${y * cellH}" width="${cellW}" height="${cellH / 2}" fill="rgb(${top.r},${top.g},${top.b})"/><rect x="${x * cellW}" y="${y * cellH + cellH / 2}" width="${cellW}" height="${cellH / 2}" fill="rgb(${bot.r},${bot.g},${bot.b})"/>`);
            pctx.fillStyle = `rgb(${top.r},${top.g},${top.b})`;
            pctx.fillRect(x * cellW, y * cellH, cellW, cellH / 2);
            pctx.fillStyle = `rgb(${bot.r},${bot.g},${bot.b})`;
            pctx.fillRect(x * cellW, y * cellH + cellH / 2, cellW, cellH / 2);
          } else {
            ansiRow += ch;
            htmlRow += ESC(ch);
            svgParts.push(`<rect x="${x * cellW}" y="${y * cellH}" width="${cellW}" height="${cellH}" fill="${mono}"/>`);
            pctx.fillStyle = mono;
            pctx.fillRect(x * cellW, y * cellH, cellW, cellH);
          }
        } else {
          const px = sampleAt(x, y);
          const lum = adjust(lumOf(px.r, px.g, px.b));
          const ch = charFor(lum, x, y);
          textRow += ch;
          if (colored) {
            ansiRow += `\x1b[38;2;${px.r};${px.g};${px.b}m${ch}\x1b[0m`;
            htmlRow += `<span style="color:rgb(${px.r},${px.g},${px.b})">${ESC(ch)}</span>`;
            svgParts.push(`<text x="${x * cellW}" y="${y * cellH + cellH * 0.68}" fill="rgb(${px.r},${px.g},${px.b})" font-family="'IBM Plex Mono',monospace" font-size="12">${ESC(ch)}</text>`);
            pctx.fillStyle = `rgb(${px.r},${px.g},${px.b})`;
            pctx.fillText(ch, x * cellW, y * cellH + cellH / 2);
          } else {
            ansiRow += ch;
            htmlRow += ESC(ch);
            svgParts.push(`<text x="${x * cellW}" y="${y * cellH + cellH * 0.68}" fill="${mono}" font-family="'IBM Plex Mono',monospace" font-size="12">${ESC(ch)}</text>`);
            pctx.fillStyle = mono;
            pctx.fillText(ch, x * cellW, y * cellH + cellH / 2);
          }
        }
      }
      textLines.push(textRow);
      ansiLines.push(ansiRow);
      htmlLines.push(htmlRow);
    }
    svgParts.push("</svg>");
    const svg = svgParts.join("");
    return {
      text: textLines.join("\n"),
      ansi: ansiLines.join("\n"),
      html: `<pre style="font-family:'IBM Plex Mono',monospace;font-size:12px;line-height:1;background:${bgColor};color:${mono};padding:16px;overflow:auto">${htmlLines.join("\n")}</pre>`,
      svg,
      pngUrl: pngCanvas.toDataURL("image/png"),
      rows,
      cols,
    };
  }, [img, width, charset, half, invert, dither, brightness, contrast, colored, bg]);

  const previewUrl = useMemo(
    () => (result && (colored || half) ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}` : null),
    [result, colored, half],
  );

  const pick = (f: File) => {
    setError(null);
    const url = URL.createObjectURL(f);
    const probe = new Image();
    probe.onload = () => setImg({ url, w: probe.naturalWidth, h: probe.naturalHeight, el: probe });
    probe.onerror = () => {
      setError("COULD NOT READ THAT IMAGE");
      URL.revokeObjectURL(url);
    };
    probe.src = url;
  };

  const download = async (kind: "txt" | "ansi" | "html" | "svg" | "png") => {
    if (!result) return;
    const blob =
      kind === "txt"
        ? new Blob([result.text], { type: "text/plain" })
        : kind === "ansi"
          ? new Blob([result.ansi], { type: "text/plain" })
          : kind === "html"
            ? new Blob([result.html], { type: "text/html" })
            : kind === "svg"
              ? new Blob([result.svg], { type: "image/svg+xml" })
              : await (await fetch(result.pngUrl)).blob();
    const link = document.createElement("a");
    link.download = `fcuk-ascii-${half ? "blocks" : charset.id}.${kind === "ansi" ? "ansi.txt" : kind}`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied("text");
    setTimeout(() => setCopied(null), 2000);
  };

  const applyPreset = (p: "terminal" | "bold" | "neon" | "poster") => {
    setHalf(p === "poster");
    setColored(p === "neon" || p === "poster");
    setDither(true);
    setContrast(p === "poster" ? 130 : 100);
    setInvert(false);
    setBrightness(0);
    setBg("black");
    setCharsetId(p === "bold" ? "blocky" : p === "neon" ? "fine" : p === "poster" ? "fine" : "classic");
  };

  return (
    <ToolShell
      crumb="ASCII-ARTIST"
      title="The pixel poet."
      tagline="Feed it an image, get back character art. Dithering, half-blocks, color modes, and TXT / ANSI / HTML / SVG / PNG export — all in your tab."
    >
      <div className="mt-10 rounded-lg border-[3px] border-dashed border-ink bg-surface p-5 text-center shadow-brutal-md">
        <Brush className="mx-auto h-8 w-8 text-ink/40" aria-hidden="true" />
        <p className="mt-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          Drop an image and turn it into text
        </p>
        <Button size="sm" className="mt-4 uppercase" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Pick image
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
            e.target.value = "";
          }}
        />
      </div>

      {img && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="space-y-5 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex flex-wrap gap-2">
              {(["terminal", "bold", "neon", "poster"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-md border-2 border-ink bg-surface-muted px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal hover:bg-yellow/40"
                >
                  {p}
                </button>
              ))}
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Width — {width}ch
              </p>
              <input
                type="range"
                min={20}
                max={200}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Character set
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CHARSETS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCharsetId(c.id)}
                    className={cn(
                      "rounded-md border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                      charsetId === c.id ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {charsetId === "custom" && (
                <input
                  value={customChars}
                  onChange={(e) => setCustomChars(e.target.value)}
                  spellCheck={false}
                  placeholder="darkest → brightest, e.g. @%#*+=-:. "
                  className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted p-2 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setHalf((v) => !v)}
                aria-pressed={half}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  half ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Half-block
              </button>
              <button
                type="button"
                onClick={() => setColored((v) => !v)}
                aria-pressed={colored}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  colored ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Colored
              </button>
              <button
                type="button"
                onClick={() => setDither((v) => !v)}
                aria-pressed={dither}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  dither ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Dither
              </button>
              <button
                type="button"
                onClick={() => setInvert((v) => !v)}
                aria-pressed={invert}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                  invert ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                Invert
              </button>
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Brightness — {brightness > 0 ? "+" : ""}{brightness}
              </p>
              <input
                type="range"
                min={-100}
                max={100}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </div>
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Contrast — {contrast}%
              </p>
              <input
                type="range"
                min={50}
                max={200}
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </div>

            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Background
              </p>
              <div className="mt-2 flex gap-2">
                {(["black", "paper"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBg(b)}
                    className={cn(
                      "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
                      bg === b ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!result} className="uppercase">
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied === "text" ? "Copied" : "Copy txt"}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => download("txt")} disabled={!result} className="uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                .txt
              </Button>
              <Button variant="secondary" size="sm" onClick={() => download("ansi")} disabled={!result} className="uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                ANSI
              </Button>
              <Button variant="secondary" size="sm" onClick={() => download("html")} disabled={!result} className="uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                .html
              </Button>
              <Button variant="secondary" size="sm" onClick={() => download("svg")} disabled={!result} className="uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                .svg
              </Button>
              <Button variant="secondary" size="sm" onClick={() => download("png")} disabled={!result} className="uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                .png
              </Button>
            </div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              [ OK ] {result ? `${result.rows} rows × ${result.cols} cols` : ""}
            </p>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Preview
            </h2>
            {previewUrl ? (
              <div className="mt-4 flex items-center justify-center rounded-md border-2 border-ink bg-paper p-4">
                <img src={previewUrl} alt="ASCII art preview" className="h-auto max-w-full [image-rendering:pixelated]" />
              </div>
            ) : (
              <pre className="mt-4 overflow-auto rounded-md border-2 border-ink bg-ink p-4 font-mono text-[9px] leading-[1.25] text-green">
                {result?.text ?? ""}
              </pre>
            )}
          </section>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Luminance mapping with Bayer dithering, computed pixel by pixel in your tab — like Grainrad, minus the GPU.
      </p>
    </ToolShell>
  );
}