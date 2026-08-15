import { useRef, useState } from "react";
import { Check, Copy, FileDown, FileText, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface ExtractResult {
  pages: string[];
  text: string;
  wordCount: number;
  charCount: number;
}

export function PdfToText() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [copied, setCopied] = useState(false);

  const extract = async (file: File) => {
    setStatus("working");
    setProgress(0);
    setError(null);
    setResult(null);
    setSourceName(file.name);
    try {
      const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
      const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string);
      GlobalWorkerOptions.workerSrc = workerUrl;

      const buf = await file.arrayBuffer();
      const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((it) => ("str" in it ? it.str : ""))
          .join(" ")
          .replace(/[ \t]+\n/g, "\n")
          .trim();
        pages.push(text);
        setProgress(Math.round((i / doc.numPages) * 100));
        await new Promise((r) => setTimeout(r, 0));
      }
      const text = pages.join("\n\n");
      const words = text.split(/\s+/).filter(Boolean).length;
      setResult({ pages, text, wordCount: words, charCount: text.length });
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
      setStatus("error");
    }
  };

  const toTxt = () => {
    if (!result) return "";
    return result.pages.map((p, i) => `--- PAGE ${i + 1} ---\n\n${p}`).join("\n\n");
  };

  const toMd = () => {
    if (!result) return "";
    return result.pages.map((p, i) => `## Page ${i + 1}\n\n${p}`).join("\n\n");
  };

  const download = (content: string, ext: "txt" | "md") => {
    const blob = new Blob([content], { type: ext === "md" ? "text/markdown" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sourceName.replace(/\.pdf$/i, "")}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Clipboard blocked — copy from the preview below instead.");
    }
  };

  const preview = result ? result.pages.join("\n\n") : "";

  return (
    <ToolShell
      crumb="PDF-TO-TEXT"
      title="The extractor."
      tagline="Every word out of your PDF, page by page. Copy it or save as .txt / .md — no 20-page preview caps, nothing uploaded."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Upload className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void extract(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-12 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {status === "idle" ? "Drop or pick a PDF" : "Pick another PDF"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Text layers only — scanned PDFs would need OCR, and that's a different tool
            </p>
          </button>

          {status === "working" && (
            <div className="mt-5 flex flex-col gap-3 rounded-md border-2 border-ink bg-ink p-5">
              <div className="h-5 w-full overflow-hidden rounded-md border-2 border-paper/30 bg-paper/10">
                <div className="h-full bg-yellow transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-paper">
                Pulling text — {progress}%
              </p>
            </div>
          )}

          {status === "done" && result && (
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-md border-2 border-ink bg-surface-muted p-3 text-center">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Pages</p>
                <p className="mt-1 font-mono text-sm font-bold text-ink">{result.pages.length}</p>
              </div>
              <div className="rounded-md border-2 border-ink bg-surface-muted p-3 text-center">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Words</p>
                <p className="mt-1 font-mono text-sm font-bold text-ink">{result.wordCount.toLocaleString()}</p>
              </div>
              <div className="rounded-md border-2 border-ink bg-surface-muted p-3 text-center">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50">Chars</p>
                <p className="mt-1 font-mono text-sm font-bold text-green">{result.charCount.toLocaleString()}</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <p className="mt-5 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Text
            <FileText className="h-4 w-4" aria-hidden="true" />
          </h2>

          {status === "done" && result ? (
            <>
              <pre className="mt-4 h-64 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-[11px] leading-relaxed text-ink">
                {preview.length > 6000 ? `${preview.slice(0, 6000)}\n\n… truncated preview — the download has it all` : preview}
              </pre>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Button onClick={copy} variant="secondary" className="uppercase">
                  {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy all"}
                </Button>
                <Button onClick={() => download(toTxt(), "txt")} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  .txt
                </Button>
                <Button onClick={() => download(toMd(), "md")} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  .md
                </Button>
              </div>
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                {sourceName} · no signup · no page-pack upsell
              </p>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Extracted text appears here
                <br />
                <span className="text-[10px] font-semibold">
                  DocTranslator shows you 1 free page then asks for a subscription. This shows all of them.
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Extracted locally with pdf.js — the extractor with no 20-page / 20MB caps.
      </p>
    </ToolShell>
  );
}
