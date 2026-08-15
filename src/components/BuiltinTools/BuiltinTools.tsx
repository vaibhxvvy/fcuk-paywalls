import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
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
  Link2,
  Clock,
  TextQuote,
  Pipette,
  ShieldCheck,
  Type,
  Blend,
  Code2,
  Images,
  Regex,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { Badge } from "../ui/badge";
import { BrickWall } from "../decoration/BrickWall";

const SvgViewer = lazy(() => import("./SvgViewer/SvgViewer").then((m) => ({ default: m.SvgViewer })));
const ImageConverter = lazy(() => import("./ImageConverter/ImageConverter").then((m) => ({ default: m.ImageConverter })));
const JsonFormatter = lazy(() => import("./JsonFormatter/JsonFormatter").then((m) => ({ default: m.JsonFormatter })));
const QrForge = lazy(() => import("./QrForge/QrForge").then((m) => ({ default: m.QrForge })));
const TextDiff = lazy(() => import("./TextDiff/TextDiff").then((m) => ({ default: m.TextDiff })));
const IdForge = lazy(() => import("./IdForge/IdForge").then((m) => ({ default: m.IdForge })));
const Base64Machine = lazy(() => import("./Base64Machine/Base64Machine").then((m) => ({ default: m.Base64Machine })));
const ImageCrusher = lazy(() => import("./ImageCrusher/ImageCrusher").then((m) => ({ default: m.ImageCrusher })));
const PaletteSnatcher = lazy(() => import("./PaletteSnatcher/PaletteSnatcher").then((m) => ({ default: m.PaletteSnatcher })));
const MarkdownForge = lazy(() => import("./MarkdownForge/MarkdownForge").then((m) => ({ default: m.MarkdownForge })));
const CsvJson = lazy(() => import("./CsvJson/CsvJson").then((m) => ({ default: m.CsvJson })));
const Sandbox = lazy(() => import("./Sandbox/Sandbox").then((m) => ({ default: m.Sandbox })));
const PdfJoiner = lazy(() => import("./PdfJoiner/PdfJoiner").then((m) => ({ default: m.PdfJoiner })));
const Hasher = lazy(() => import("./Hasher/Hasher").then((m) => ({ default: m.Hasher })));
const AsciiArtist = lazy(() => import("./AsciiArtist/AsciiArtist").then((m) => ({ default: m.AsciiArtist })));
const LinkCleaner = lazy(() => import("./LinkCleaner/LinkCleaner").then((m) => ({ default: m.LinkCleaner })));
const Timestamp = lazy(() => import("./Timestamp/Timestamp").then((m) => ({ default: m.Timestamp })));
const LoremGenerator = lazy(() => import("./LoremGenerator/LoremGenerator").then((m) => ({ default: m.LoremGenerator })));
const ColorLab = lazy(() => import("./ColorLab/ColorLab").then((m) => ({ default: m.ColorLab })));
const ExifStripper = lazy(() => import("./ExifStripper/ExifStripper").then((m) => ({ default: m.ExifStripper })));
const FontPairs = lazy(() => import("./FontPairs/FontPairs").then((m) => ({ default: m.FontPairs })));
const GradientForge = lazy(() => import("./GradientForge/GradientForge").then((m) => ({ default: m.GradientForge })));
const JsonToTs = lazy(() => import("./JsonToTs/JsonToTs").then((m) => ({ default: m.JsonToTs })));
const ImageToPdf = lazy(() => import("./ImageToPdf/ImageToPdf").then((m) => ({ default: m.ImageToPdf })));
const RegexLab = lazy(() => import("./RegexLab/RegexLab").then((m) => ({ default: m.RegexLab })));

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
  {
    id: "link-cleaner",
    name: "Link cleaner",
    description:
      "Strip tracking params, follow redirect chains, hand you back a clean URL. Your links, degreased.",
    icon: Link2,
    status: "live",
  },
  {
    id: "timestamp",
    name: "Timestamp converter",
    description:
      "Unix seconds, milliseconds, ISO — convert any timestamp into everything else. Time, decoded.",
    icon: Clock,
    status: "live",
  },
  {
    id: "lorem-generator",
    name: "Lorem generator",
    description:
      "Lorem ipsum with optional attitude. Paragraphs, sentences or words — minted locally in your tab.",
    icon: TextQuote,
    status: "live",
  },
  {
    id: "color-lab",
    name: "Color lab",
    description:
      "HEX ⇄ RGB ⇄ HSL ⇄ CMYK, WCAG contrast checks and a shade ladder — all mixed in your tab.",
    icon: Pipette,
    status: "live",
  },
  {
    id: "exif-stripper",
    name: "EXIF stripper",
    description:
      "Scrub GPS, camera, dates and hidden metadata from your photos. Byte-level surgery in your tab.",
    icon: ShieldCheck,
    status: "live",
  },
  {
    id: "font-pairs",
    name: "Font pairs",
    description:
      "Preview curated headline + body font pairings with your own copy. Steal the CSS, ship the design.",
    icon: Type,
    status: "live",
  },
  {
    id: "gradient-forge",
    name: "Gradient forge",
    description:
      "Linear, radial or conic gradients with any stops you like. Mix, preview, copy the CSS.",
    icon: Blend,
    status: "live",
  },
  {
    id: "json-to-ts",
    name: "JSON → TypeScript",
    description:
      "Paste JSON, walk out with TypeScript interfaces. Nested objects, arrays, unions — typed in your tab.",
    icon: Code2,
    status: "live",
  },
  {
    id: "image-to-pdf",
    name: "Image → PDF",
    description:
      "Stack images, get back a PDF. JPG and PNG embed natively; anything else is converted first.",
    icon: Images,
    status: "live",
  },
  {
    id: "regex-lab",
    name: "Regex lab",
    description:
      "Write a pattern, watch it hunt. Live highlighting, match counts, capture groups — all in your tab.",
    icon: Regex,
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
  "link-cleaner": () => <LinkCleaner />,
  timestamp: () => <Timestamp />,
  "lorem-generator": () => <LoremGenerator />,
  "color-lab": () => <ColorLab />,
  "exif-stripper": () => <ExifStripper />,
  "font-pairs": () => <FontPairs />,
  "gradient-forge": () => <GradientForge />,
  "json-to-ts": () => <JsonToTs />,
  "image-to-pdf": () => <ImageToPdf />,
  "regex-lab": () => <RegexLab />,
};

interface BuiltinToolsProps {
  route: string;
}

export function BuiltinTools({ route }: BuiltinToolsProps) {
  const match = route.match(/^\/tools\/([^/]+)/);
  const toolId = match?.[1];
  if (toolId && TOOL_ROUTES[toolId]) {
    return (
      <Suspense
        fallback={
          <main className="py-12" id="main-content">
            <div className="page-container">
              <p className="animate-pulse font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                INDEX / TOOLS
              </p>
              <h1 className="mt-2 animate-pulse font-display text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.95] tracking-tight">
                Loading…
              </h1>
            </div>
          </main>
        }
      >
        {TOOL_ROUTES[toolId]()}
      </Suspense>
    );
  }

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