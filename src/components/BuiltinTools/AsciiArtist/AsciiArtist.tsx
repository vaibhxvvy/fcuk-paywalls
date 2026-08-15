import { useRef, useState } from "react";
import { Brush, Copy, Download, Sparkles, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const CHARS = "@%#*+=-:. ";

export function AsciiArtist() {
  const [url, setUrl] = useState<string | null>(null);
  const [width, setWidth] = useState(80);
  const [invert, setInvert] = useState(false);
  const [art, setArt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const generate = (img: HTMLImageElement) => {
    const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * width * 0.5));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, h);
    const data = ctx.getImageData(0, 0, width, h).data;
    const rows: string[] = [];
    for (let y = 0; y < h; y++) {
      let row = "";
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const idx = invert ? Math.round(((255 - lum) / 255) * (CHARS.length - 1)) : Math.round((lum / 255) * (CHARS.length - 1));
        row += CHARS[Math.min(CHARS.length - 1, Math.max(0, idx))];
      }
      rows.push(row);
    }
    setArt(rows.join("\n"));
    setError(null);
  };

  const pick = (f: File) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(f);
    img.onload = () => {
      setUrl(objectUrl);
      generate(img);
    };
    img.onerror = () => {
      setError("COULD NOT READ THAT IMAGE");
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const redo = () => {
    if (!url) return;
    const img = new Image();
    img.onload = () => generate(img);
    img.src = url;
  };

  const download = () => {
    if (!art) return;
    const blob = new Blob([art], { type: "text/plain" });
    const a = document.createElement("a");
    a.download = "fcuk-ascii.txt";
    a.href = URL.createObjectURL(blob);
    a.click();
  };

  const copy = async () => {
    if (!art) return;
    await navigator.clipboard.writeText(art);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="ASCII-ARTIST"
      title="The pixel poet."
      tagline="Feed it an image, get back pure character art. Luminance-mapped, generated locally in your tab."
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

      {url && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
            Width
          </p>
          <input
            type="range"
            min={20}
            max={200}
            value={width}
            onChange={(e) => {
              setWidth(Number(e.target.value));
              redo();
            }}
            className="w-48 accent-yellow"
          />
          <span className="w-12 font-mono text-xs font-bold text-ink">{width}ch</span>
          <button
            type="button"
            onClick={() => {
              setInvert((v) => !v);
              redo();
            }}
            aria-pressed={invert}
            className="rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal data-[pressed=true]:bg-ink data-[pressed=true]:text-surface data-[pressed=true]:shadow-brutal-sm"
            data-pressed={invert}
          >
            Invert
          </button>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!art} className="uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="sm" onClick={download} disabled={!art} className="uppercase">
              <Download className="h-4 w-4" aria-hidden="true" />
              .txt
            </Button>
          </div>
        </div>
      )}

      {art && (
        <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <pre className="overflow-auto rounded-md border-2 border-ink bg-ink p-4 font-mono text-[9px] leading-[1.25] text-green">
            {art}
          </pre>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            [ OK ] {art.split("\n").length} ROWS × {width} COLS
          </p>
        </section>
      )}

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Luminance → character mapping, done pixel by pixel in your tab.
      </p>
    </ToolShell>
  );
}