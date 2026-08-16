import { useRef, useState } from "react";
import { FileDown, Stamp, Trash2 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface WatermarkFile {
  id: number;
  name: string;
  img: HTMLImageElement;
  dataUrl: string;
}

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

let wmId = 1;

export function BatchWatermarker() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<WatermarkFile[]>([]);
  const [text, setText] = useState("");
  const [opacity, setOpacity] = useState(35);
  const [size, setSize] = useState(24);
  const [diagonal, setDiagonal] = useState(true);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const imgs: WatermarkFile[] = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const dataUrl = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = () => rej(new Error("Read failed"));
          r.readAsDataURL(f);
        });
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => rej(new Error("Decode failed"));
          i.src = dataUrl;
        });
        imgs.push({ id: wmId++, name: f.name, img, dataUrl });
      } catch {
        // skip unreadable files
      }
    }
    setFiles((fs) => [...fs, ...imgs]);
  };

  const removeFile = (id: number) => setFiles((fs) => fs.filter((f) => f.id !== id));

  const renderWatermarked = (f: WatermarkFile): string => {
    const canvas = document.createElement("canvas");
    canvas.width = f.img.naturalWidth;
    canvas.height = f.img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f.dataUrl;
    ctx.drawImage(f.img, 0, 0);
    ctx.globalAlpha = opacity / 100;
    ctx.fillStyle = "#111";
    ctx.font = `700 ${size}px "IBM Plex Mono", monospace`;
    const lineH = size * 1.3;
    const lines = text.split("\n").filter(Boolean);
    if (lines.length === 0) return f.dataUrl;
    if (diagonal) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 4);
      const step = size * 7;
      const span = Math.max(canvas.width, canvas.height) * 1.5;
      ctx.textAlign = "center";
      for (let x = -span; x < span; x += step) {
        for (let y = -span; y < span; y += step) {
          lines.forEach((l, li) => ctx.fillText(l, x, y + li * lineH));
        }
      }
      ctx.rotate(Math.PI / 4);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    } else {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((l, li) => ctx.fillText(l, size, size + li * lineH));
    }
    ctx.globalAlpha = 1;
    return canvas.toDataURL("image/png");
  };

  const downloadAll = async () => {
    setStatus("working");
    setProgress(0);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const dataUrl = renderWatermarked(files[i]);
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${files[i].name.replace(/\.[^.]+$/, "")}-watermarked.png`;
        a.click();
        setProgress(Math.round(((i + 1) / files.length) * 100));
        await new Promise((r) => setTimeout(r, 250));
      }
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not watermark.");
      setStatus("error");
    }
  };

  return (
    <ToolShell
      crumb="BATCH-WATERMARKER"
      title="The stamp."
      tagline="Stamp your name over a whole folder of images at once — text tiles, diagonal or corner. watermark.ws charges for batch; a canvas loop doesn't."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Stamp
            <Stamp className="h-4 w-4" aria-hidden="true" />
          </h2>
          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Watermark text
            </span>
            <input
              className={inputCls}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="© your name — newline for multiple lines"
            />
          </label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Opacity {opacity}%
              </span>
              <input
                type="range"
                min={5}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-2 w-full accent-ink"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Size {size}px
              </span>
              <input
                type="range"
                min={10}
                max={80}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="mt-2 w-full accent-ink"
              />
            </label>
            <label className="mt-1 block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Layout</span>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDiagonal(true)}
                  className={
                    diagonal
                      ? "flex-1 rounded-md border-2 border-ink bg-ink px-1 py-1.5 font-mono text-[9px] font-bold text-paper"
                      : "flex-1 rounded-md border-2 border-ink bg-surface-muted px-1 py-1.5 font-mono text-[9px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                  }
                >
                  Tile
                </button>
                <button
                  type="button"
                  onClick={() => setDiagonal(false)}
                  className={
                    !diagonal
                      ? "flex-1 rounded-md border-2 border-ink bg-ink px-1 py-1.5 font-mono text-[9px] font-bold text-paper"
                      : "flex-1 rounded-md border-2 border-ink bg-surface-muted px-1 py-1.5 font-mono text-[9px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-yellow/30"
                  }
                >
                  Corner
                </button>
              </div>
            </label>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              Add images — one or a hundred
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Everything renders on your machine, batch downloads follow
            </p>
          </button>

          {files.length > 0 && (
            <>
              <div className="mt-4 max-h-52 space-y-2 overflow-auto">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5">
                    <img src={f.dataUrl} alt="" className="h-8 w-8 rounded-sm border-2 border-ink/20 object-cover" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                      {f.name} · {f.img.naturalWidth}×{f.img.naturalHeight}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="rounded-md border-2 border-ink p-1 text-ink transition-colors duration-200 ease-brutal hover:bg-red/30"
                      title="Remove"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={() => void downloadAll()} disabled={!text.trim() || status === "working"} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  {status === "working" ? `Stamping… ${progress}%` : `Stamp ${files.length} file${files.length === 1 ? "" : "s"}`}
                </Button>
                {!text.trim() && (
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                    Write the watermark text first.
                  </p>
                )}
              </div>
            </>
          )}

          {status === "done" && (
            <p className="mt-3 rounded-md border-2 border-ink bg-green/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              Stamped copies downloaded — originals untouched.
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Preview</h2>
          {files.length > 0 ? (
            <div className="mt-4 grid flex-1 grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-3">
              {files.slice(0, 12).map((f) => (
                <img
                  key={f.id}
                  src={renderWatermarked(f)}
                  alt={f.name}
                  className="w-full rounded-sm border-2 border-ink/20"
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Live previews land here
                <br />
                <span className="text-[10px] font-semibold">
                  Tile = diagonal repeat, corner = top-left block
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Stamped locally on canvas — unlimited batch, no credits, no watermark on your watermark.
      </p>
    </ToolShell>
  );
}