import { useEffect, useRef, useState } from "react";
import { Download, Laptop, Monitor, Smartphone, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type Device = "phone" | "laptop" | "tablet";

const DEVICES: { id: Device; label: string; icon: typeof Smartphone }[] = [
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "tablet", label: "Tablet", icon: Monitor },
];

interface Frame {
  w: number;
  h: number;
  screen: { x: number; y: number; w: number; h: number };
}

const FRAMES: Record<Device, Frame> = {
  phone: {
    w: 480,
    h: 960,
    screen: { x: 34, y: 60, w: 412, h: 848 },
  },
  laptop: {
    w: 1280,
    h: 800,
    screen: { x: 96, y: 40, w: 1088, h: 680 },
  },
  tablet: {
    w: 900,
    h: 1200,
    screen: { x: 60, y: 70, w: 780, h: 1030 },
  },
};

const BG_SWATCHES = ["#f5f0e8", "#ffffff", "#111111", "#ffd84d", "#ff5a5f"];

export function MockupForge() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [device, setDevice] = useState<Device>("phone");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [imgName, setImgName] = useState("");
  const [frameColor, setFrameColor] = useState("#111111");
  const [bg, setBg] = useState("#f5f0e8");
  const [out, setOut] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const frame = FRAMES[device];
  const SCALE = 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = frame.w * SCALE;
    canvas.height = frame.h * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const s = SCALE;
    ctx.fillStyle = frameColor;
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    rr(frame.screen.x * s - 18 * s, frame.screen.y * s - 18 * s, (frame.screen.w + 36) * s, (frame.screen.h + 36) * s, device === "phone" ? 48 * s : 24 * s);
    ctx.fill();
    ctx.fillStyle = "#000000";
    rr(frame.screen.x * s, frame.screen.y * s, frame.screen.w * s, frame.screen.h * s, device === "phone" ? 36 * s : 16 * s);
    ctx.fill();

    if (img) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (iw > 0 && ih > 0) {
        const cover = Math.max(frame.screen.w / iw, frame.screen.h / ih);
        const sw = frame.screen.w / cover;
        const sh = frame.screen.h / cover;
        ctx.save();
        rr(frame.screen.x * s, frame.screen.y * s, frame.screen.w * s, frame.screen.h * s, device === "phone" ? 36 * s : 16 * s);
        ctx.clip();
        ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, frame.screen.x * s, frame.screen.y * s, frame.screen.w * s, frame.screen.h * s);
        ctx.restore();
      }
    }

    if (device === "phone") {
      ctx.fillStyle = frameColor;
      ctx.fillRect((frame.w / 2 - 40) * s, 14 * s, 80 * s, 12 * s);
    }
    if (device === "laptop") {
      ctx.fillStyle = frameColor;
      rr(0, (frame.h - 64) * s, frame.w * s, 64 * s, 10 * s);
      ctx.fill();
      ctx.fillStyle = bg;
      rr(30 * s, (frame.h - 34) * s, (frame.w - 60) * s, 16 * s, 8 * s);
      ctx.fill();
    }
    setOut(canvas.toDataURL("image/png"));
  }, [device, img, frameColor, bg, frame]);

  const onFile = (f: File) => {
    setError(null);
    const u = URL.createObjectURL(f);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setImgName(f.name);
    };
    image.onerror = () => {
      URL.revokeObjectURL(u);
      setError("That file isn't a readable image.");
    };
    image.src = u;
  };

  const download = () => {
    if (!out) return;
    const a = document.createElement("a");
    a.href = out;
    a.download = `mockup-${device}-${(imgName || "design").replace(/\.[^.]+$/, "")}.png`;
    a.click();
  };

  return (
    <ToolShell
      crumb="MOCKUP-FORGE"
      title="The showcase."
      tagline="Drop a design into a phone, laptop or tablet frame and export a clean PNG. Placeit's free tier only hands out watermarked previews — the actual frame is a rectangle with rounded corners."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[01] The frame</h2>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDevice(d.id)}
                aria-pressed={device === d.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                  device === d.id ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted text-ink/70 hover:bg-yellow/30",
                )}
              >
                <d.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {d.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Frame</span>
            {["#111111", "#ff5a5f", "#ffd84d", "#ffffff"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFrameColor(c)}
                aria-label={`Frame ${c}`}
                aria-pressed={frameColor === c}
                className={cn(
                  "h-7 w-7 rounded-md border-2 border-ink transition-transform duration-200 ease-brutal hover:scale-110",
                  frameColor === c && "shadow-brutal-sm",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Backdrop</span>
            {BG_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBg(c)}
                aria-label={`Backdrop ${c}`}
                aria-pressed={bg === c}
                className={cn(
                  "h-7 w-7 rounded-md border-2 border-ink transition-transform duration-200 ease-brutal hover:scale-110",
                  bg === c && "shadow-brutal-sm",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-6 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <Upload className="mx-auto h-5 w-5" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {imgName ? imgName : "Drop your design here"}
            </p>
            <p className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              Cover-fit into the screen — screenshot, poster, UI shot
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Canvas out</h2>

          {out ? (
            <>
              <img src={out} alt="Mockup preview" className="mt-4 w-full rounded-md border-2 border-ink" />
              <Button onClick={download} className="mt-4 w-full uppercase">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download PNG ({Math.round(frame.w / 120)}×{Math.round(frame.h / 120)} @2×)
              </Button>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The mockup appears here once a design is loaded
              </p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Frames are drawn in code, not downloaded — zero template licensing, zero watermarks.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Placeit charges $2.95 per template or $14.95 a month; a rounded rectangle with your pixels in it is free.
      </p>
    </ToolShell>
  );
}