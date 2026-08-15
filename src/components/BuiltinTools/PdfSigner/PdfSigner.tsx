import { useEffect, useRef, useState } from "react";
import { Download, Eraser, FileUp, PenLine, Type, Undo2 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const PAD_W = 800;
const PAD_H = 280;

interface PdfInfo {
  name: string;
  bytes: ArrayBuffer;
  pageCount: number;
}

interface Stroke {
  points: [number, number][];
}

const POSITIONS = ["bottom-right", "bottom-left", "top-right", "top-left", "center"] as const;
type Position = (typeof POSITIONS)[number];

export function PdfSigner() {
  const padRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdf, setPdf] = useState<PdfInfo | null>(null);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [penSize, setPenSize] = useState(4);
  const [sigSize, setSigSize] = useState(36);
  const [opacity, setOpacity] = useState(1);
  const [page, setPage] = useState(1);
  const [position, setPosition] = useState<Position>("bottom-right");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [outName, setOutName] = useState("signed.pdf");

  useEffect(() => {
    const canvas = padRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    ctx.strokeStyle = "#111111";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = penSize;
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
      for (const [x, y] of stroke.points.slice(1)) ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [strokes, penSize]);

  const toCanvas = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * PAD_W,
      ((e.clientY - rect.top) / rect.height) * PAD_H,
    ];
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    setStrokes((s) => [...s, { points: [toCanvas(e)] }]);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    setStrokes((s) => {
      const copy = [...s];
      copy[copy.length - 1] = { points: [...copy[copy.length - 1].points, toCanvas(e)] };
      return copy;
    });
  };

  const onPointerUp = () => setDrawing(false);

  const onPick = async (file: File) => {
    setError(null);
    setStatus("idle");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setPdf({ name: file.name, bytes, pageCount: doc.getPageCount() });
      setPage(1);
      setOutName(file.name.replace(/\.pdf$/i, "") + "-signed.pdf");
    } catch {
      setError("Could not read that PDF (is it corrupted or locked?).");
      setStatus("error");
    }
  };

  const bbox = (): [number, number, number, number] | null => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of strokes)
      for (const [x, y] of s.points) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    if (!isFinite(minX)) return null;
    return [minX, minY, maxX, maxY];
  };

  const signaturePng = (): string | null => {
    const box = bbox();
    if (!box) return null;
    const [minX, minY, maxX, maxY] = box;
    const pad = Math.max(penSize * 3, 16);
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const ctx = tmp.getContext("2d")!;
    ctx.strokeStyle = "#111111";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = penSize;
    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(s.points[0][0] - minX + pad, s.points[0][1] - minY + pad);
      for (const [x, y] of s.points.slice(1)) ctx.lineTo(x - minX + pad, y - minY + pad);
      ctx.stroke();
    }
    return tmp.toDataURL("image/png");
  };

  const sign = async () => {
    if (!pdf) return;
    setStatus("working");
    setError(null);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdf.bytes, { ignoreEncryption: true });
      const target = doc.getPage(Math.min(Math.max(1, page), doc.getPageCount()) - 1);
      const { width: pw, height: ph } = target.getSize();
      const margin = 48;

      let dw = 0;
      let dh = 0;
      let drawFn: () => Promise<void> = async () => {};
      const getPos = (w: number, h: number): [number, number] => {
        const x0 = margin;
        const y0 = margin;
        const x1 = pw - margin - w;
        const y1 = ph - margin - h;
        switch (position) {
          case "bottom-left":
            return [x0, y0];
          case "top-right":
            return [x1, y1];
          case "top-left":
            return [x0, y1];
          case "center":
            return [(pw - w) / 2, (ph - h) / 2];
          case "bottom-right":
          default:
            return [x1, y0];
        }
      };

      if (mode === "draw") {
        const dataUrl = signaturePng();
        if (!dataUrl) {
          setStatus("idle");
          return;
        }
        const pngBytes = await (await fetch(dataUrl)).arrayBuffer();
        const img = await doc.embedPng(pngBytes as ArrayBuffer);
        const ratio = img.width / img.height;
        dh = sigSize;
        dw = dh * ratio;
        const [x, y] = getPos(dw, dh);
        drawFn = async () => {
          target.drawImage(img, { x, y, width: dw, height: dh, opacity });
        };
      } else {
        const text = typed.trim();
        if (!text) {
          setStatus("idle");
          return;
        }
        const font = await doc.embedFont(StandardFonts.HelveticaOblique);
        const size = sigSize;
        dw = font.widthOfTextAtSize(text, size);
        dh = size;
        const [x, y] = getPos(dw, dh);
        drawFn = async () => {
          target.drawText(text, { x, y, size, font, color: rgb(0, 0, 0), opacity });
        };
      }

      await drawFn();
      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign that PDF.");
      setStatus("error");
    }
  };

  const canSign = !!pdf && (mode === "type" ? typed.trim().length > 0 : strokes.length > 0);

  return (
    <ToolShell
      crumb="PDF-SIGNER"
      title="The signer."
      tagline="Draw or type a signature, drop it on any page, download the signed PDF. The part DocuSign charges $10 a month for."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Document
            <FileUp className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPick(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {pdf ? "Pick another PDF" : "Drop or pick a PDF to sign"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              {pdf ? `${pdf.name} · ${pdf.pageCount} page${pdf.pageCount === 1 ? "" : "s"}` : "Stays in your tab — DocuSign never sees it"}
            </p>
          </button>

          {pdf && (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Page — {page} of {pdf.pageCount}
                </span>
                <input
                  type="range"
                  min={1}
                  max={pdf.pageCount}
                  step={1}
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                  className="mt-2 w-full accent-yellow"
                />
              </label>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Placement</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {POSITIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPosition(p)}
                      className={cnChip(p === position)}
                    >
                      {p.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Signature
            <PenLine className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 flex gap-1.5">
            <button type="button" onClick={() => setMode("draw")} className={cnChip(mode === "draw")}>
              <PenLine className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Draw
            </button>
            <button type="button" onClick={() => setMode("type")} className={cnChip(mode === "type")}>
              <Type className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Type
            </button>
            <button
              type="button"
              onClick={() => setStrokes([])}
              className="ml-auto rounded-md border-2 border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-red/15 active:translate-y-0"
            >
              <Eraser className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Clear
            </button>
            {mode === "draw" && (
              <button
                type="button"
                onClick={() => setStrokes((s) => s.slice(0, -1))}
                disabled={strokes.length === 0}
                className="rounded-md border-2 border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Undo2 className="mr-1 inline h-3 w-3" aria-hidden="true" />
                Undo
              </button>
            )}
          </div>

          {mode === "draw" ? (
            <canvas
              ref={padRef}
              width={PAD_W}
              height={PAD_H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="mt-3 h-40 w-full touch-none rounded-md border-[3px] border-dashed border-ink bg-surface-muted"
            />
          ) : (
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Your name, in script"
              className="mt-3 w-full rounded-md border-[3px] border-dashed border-ink bg-surface-muted px-3 py-3 font-mono text-sm text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          )}

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Pen thickness — {penSize}px
              </span>
              <input
                type="range"
                min={2}
                max={10}
                step={1}
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Signature size — {sigSize}pt
              </span>
              <input
                type="range"
                min={14}
                max={72}
                step={1}
                value={sigSize}
                onChange={(e) => setSigSize(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                Opacity — {Math.round(opacity * 100)}%
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-2 w-full accent-yellow"
              />
            </label>
          </div>

          <Button onClick={sign} disabled={!canSign || status === "working"} className="mt-4 w-full uppercase">
            <Download className="h-4 w-4" aria-hidden="true" />
            {status === "working" ? "Signing…" : "Sign & download"}
          </Button>

          {status === "done" && (
            <p className="mt-3 rounded-md border-2 border-ink bg-green/20 px-3 py-2.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              Signed — check your downloads. Now that one's yours.
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Signed locally with pdf-lib — no subscription for the privilege of writing your own name.
      </p>
    </ToolShell>
  );
}

const cnChip = (active: boolean) =>
  `rounded-md border-2 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,transform] duration-200 ease-brutal ${
    active
      ? "border-ink bg-ink text-paper"
      : "border-ink bg-surface-muted text-ink hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
  }`;
