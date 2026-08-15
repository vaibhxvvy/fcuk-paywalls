import {
  Shapes,
  ImageDown,
  Braces,
  QrCode,
  ArrowLeftRight,
  Fingerprint,
  Binary,
  Gauge,
  Palette,
  FileCode,
  Table2,
  AppWindow,
  Paperclip,
  Hash,
  Brush,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useModal } from "../../hooks/useModal";
import { Badge } from "../ui/badge";
import { BrickWall } from "../decoration/BrickWall";
import { SvgViewer } from "./SvgViewer/SvgViewer";
import { ImageConverter } from "./ImageConverter/ImageConverter";
import { JsonFormatter } from "./JsonFormatter/JsonFormatter";
import { QrForge } from "./QrForge/QrForge";
import { TextDiff } from "./TextDiff/TextDiff";
import { IdForge } from "./IdForge/IdForge";
import { Base64Machine } from "./Base64Machine/Base64Machine";
import { ImageCrusher } from "./ImageCrusher/ImageCrusher";
import { PaletteSnatcher } from "./PaletteSnatcher/PaletteSnatcher";
import { MarkdownForge } from "./MarkdownForge/MarkdownForge";
import { CsvJson } from "./CsvJson/CsvJson";
import { Sandbox } from "./Sandbox/Sandbox";
import { PdfJoiner } from "./PdfJoiner/PdfJoiner";
import { Hasher } from "./Hasher/Hasher";
import { AsciiArtist } from "./AsciiArtist/AsciiArtist";

interface BuiltinToolEntry {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: "live" | "soon";
}

const BUILTIN_TOOLS: BuiltinToolEntry[] = [
  {
    id: "svg-viewer",
    name: "SVG viewer",
    description:
      "Paste any SVG, preview it on paper or checker, zoom in, copy the code, download the file. All in your browser.",
    icon: Shapes,
    status: "live",
  },
  {
    id: "image-converter",
    name: "Image converter",
    description:
      "SVG, PNG, JPG, WEBP and ICO — convert between any of them with quality and background control. Or trace any image into a clean SVG.",
    icon: ImageDown,
    status: "live",
  },
  {
    id: "json-formatter",
    name: "JSON formatter",
    description:
      "Paste minified chaos, get readable order. Validate, format, minify — all in your browser, nothing uploaded.",
    icon: Braces,
    status: "live",
  },
  {
    id: "qr-forge",
    name: "QR forge",
    description:
      "Turn any text or URL into a scannable square. SVG or PNG, any size, with real error correction.",
    icon: QrCode,
    status: "live",
  },
  {
    id: "text-diff",
    name: "Text diff",
    description:
      "Two texts, one truth. Side-by-side line diff with added, removed and unchanged — computed locally.",
    icon: ArrowLeftRight,
    status: "live",
  },
  {
    id: "id-forge",
    name: "ID & password forge",
    description:
      "UUIDs, passwords, secrets — minted locally with real cryptographic randomness. Your keys, your tab.",
    icon: Fingerprint,
    status: "live",
  },
  {
    id: "base64",
    name: "Base64 machine",
    description:
      "Encode and decode between UTF-8, Base64, Base64URL, hex and URL-encoding. All of it, in your tab.",
    icon: Binary,
    status: "live",
  },
  {
    id: "image-crusher",
    name: "Image crusher",
    description:
      "Smash image file size down to a fraction. Canvas-based re-encode with level control, right in the tab.",
    icon: Gauge,
    status: "live",
  },
  {
    id: "palette-snatcher",
    name: "Palette snatcher",
    description:
      "Feed it an image, walk away with its color palette. Dominant colors with hex and CSS variables.",
    icon: Palette,
    status: "live",
  },
  {
    id: "markdown-forge",
    name: "Markdown forge",
    description:
      "Drop Markdown, walk out with HTML. Rendered live with GFM — headers, code blocks, tables, links.",
    icon: FileCode,
    status: "live",
  },
  {
    id: "csv-json",
    name: "CSV ⇄ JSON",
    description:
      "Both directions, fully in your tab. Quoted fields, commas, the works — no spreadsheet app needed.",
    icon: Table2,
    status: "live",
  },
  {
    id: "sandbox",
    name: "Mini sandbox",
    description:
      "Write a bit of JavaScript, run it right here. Console output, errors — in a real sandboxed iframe.",
    icon: AppWindow,
    status: "live",
  },
  {
    id: "pdf-joiner",
    name: "PDF joiner",
    description:
      "Stack PDFs, stitch them into one. Reorder, drop, join — all in your browser, nothing uploaded.",
    icon: Paperclip,
    status: "live",
  },
  {
    id: "hasher",
    name: "Hasher",
    description:
      "Hash any text with SHA-256, SHA-512, SHA-1 and MD5 at once. Web Crypto, right in your tab.",
    icon: Hash,
    status: "live",
  },
  {
    id: "ascii-artist",
    name: "ASCII artist",
    description:
      "Feed it an image, get back pure character art. Luminance-mapped, generated locally in your tab.",
    icon: Brush,
    status: "live",
  },
];

const TOOL_ROUTES: Record<string, () => ReactNode> = {
  "svg-viewer": () => <SvgViewer />,
  "image-converter": () => <ImageConverter />,
  "json-formatter": () => <JsonFormatter />,
  "qr-forge": () => <QrForge />,
  "text-diff": () => <TextDiff />,
  "id-forge": () => <IdForge />,
  base64: () => <Base64Machine />,
  "image-crusher": () => <ImageCrusher />,
  "palette-snatcher": () => <PaletteSnatcher />,
  "markdown-forge": () => <MarkdownForge />,
  "csv-json": () => <CsvJson />,
  sandbox: () => <Sandbox />,
  "pdf-joiner": () => <PdfJoiner />,
  hasher: () => <Hasher />,
  "ascii-artist": () => <AsciiArtist />,
};

interface BuiltinToolsProps {
  route: string;
}

export function BuiltinTools({ route }: BuiltinToolsProps) {
  const match = route.match(/^\/tools\/([^/]+)/);
  const toolId = match?.[1];
  if (toolId && TOOL_ROUTES[toolId]) return TOOL_ROUTES[toolId]();

  return <ToolsLanding />;
}

function ToolsLanding() {
  const { showModalWithID } = useModal();

  return (
    <main className="py-12" id="main-content">
      <div className="page-container">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          INDEX / TOOLS
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.75rem,8vw,6rem)] font-bold uppercase leading-[0.95] tracking-tight">
          The
          <br />
          arsenal.
        </h1>
        <p className="mt-4 max-w-md text-lg font-medium text-ink/80">
          Built-in tools. No account. No email. No walls. Just open the tool
          and it works — right here, in your browser.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_TOOLS.map((tool, i) => (
            <a
              key={tool.id}
              href={`#/tools/${tool.id}`}
              target="_self"
              className="group relative flex min-h-[220px] flex-col gap-3 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md transition-[transform,box-shadow] duration-200 ease-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm"
            >
              <span
                aria-hidden="true"
                className="absolute top-3 right-3 font-mono text-[10px] font-semibold text-ink/30"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-ink bg-yellow shadow-brutal-sm">
                <tool.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
                {tool.name}
              </h2>
              <p className="text-sm leading-relaxed text-ink/80">
                {tool.description}
              </p>
              <span className="mt-auto flex items-center gap-2">
                <Badge variant="green">Live</Badge>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/50 group-hover:text-ink">
                  Open ↗
                </span>
              </span>
            </a>
          ))}

          <button
            type="button"
            onClick={() => showModalWithID("suggest-tool")}
            className="flex min-h-[220px] flex-col gap-3 rounded-lg border-[3px] border-dashed border-ink/60 bg-transparent p-5 text-left transition-[transform,border-color,background-color] duration-200 ease-brutal hover:-translate-x-1 hover:-translate-y-1 hover:border-ink hover:bg-surface-muted/50 active:translate-x-0 active:translate-y-0"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-dashed border-ink bg-surface-muted">
              <Lightbulb className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
              Your idea here
            </h2>
            <p className="text-sm leading-relaxed text-ink/80">
              Want a built-in tool that doesn&apos;t exist yet? Tell us — the
              next one could be yours.
            </p>
            <span className="mt-auto flex items-center gap-2">
              <Badge variant="outline">Soon</Badge>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/50">
                Suggest →
              </span>
            </span>
          </button>
        </div>
      </div>

      <BrickWall className="mt-14" />
    </main>
  );
}