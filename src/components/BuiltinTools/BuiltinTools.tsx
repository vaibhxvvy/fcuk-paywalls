import { lazy, Suspense, useMemo, useState } from "react";
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
  Search,
  Lightbulb,
  CaseSensitive,
  BarChart3,
  AudioWaveform,
  Terminal,
  Ruler,
  Crop,
  ShieldAlert,
  Network,
  FileCode2,
  CalendarClock,
  Globe,
  FileJson,
  FileText,
  Volume2,
  Mic,
  FileDown,
  Scissors,
  ZoomIn,
  Clapperboard,
  ScrollText,
  PenLine,
  Receipt,
  Eraser,
  FileInput,
  Stamp,
  IdCard,
  CreditCard,
  Mail,
  Film,
  Music,
  MonitorPlay,
  Barcode,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { Badge } from "../ui/badge";
import { BrickWall } from "../decoration/BrickWall";
import { cn } from "../../utils/cn";

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
const CaseConverter = lazy(() => import("./CaseConverter/CaseConverter").then((m) => ({ default: m.CaseConverter })));
const TextStats = lazy(() => import("./TextStats/TextStats").then((m) => ({ default: m.TextStats })));
const Morse = lazy(() => import("./Morse/Morse").then((m) => ({ default: m.Morse })));
const AsciiTable = lazy(() => import("./AsciiTable/AsciiTable").then((m) => ({ default: m.AsciiTable })));
const UnitConverter = lazy(() => import("./UnitConverter/UnitConverter").then((m) => ({ default: m.UnitConverter })));
const ImageResizer = lazy(() => import("./ImageResizer/ImageResizer").then((m) => ({ default: m.ImageResizer })));
const PasswordTester = lazy(() => import("./PasswordTester/PasswordTester").then((m) => ({ default: m.PasswordTester })));
const SubnetCalculator = lazy(() => import("./SubnetCalculator/SubnetCalculator").then((m) => ({ default: m.SubnetCalculator })));
const DataUriGenerator = lazy(() => import("./DataUriGenerator/DataUriGenerator").then((m) => ({ default: m.DataUriGenerator })));
const CronBuilder = lazy(() => import("./CronBuilder/CronBuilder").then((m) => ({ default: m.CronBuilder })));
const HttpStatus = lazy(() => import("./HttpStatus/HttpStatus").then((m) => ({ default: m.HttpStatus })));
const YamlJson = lazy(() => import("./YamlJson/YamlJson").then((m) => ({ default: m.YamlJson })));
const ResumeBuilder = lazy(() => import("./ResumeBuilder/ResumeBuilder").then((m) => ({ default: m.ResumeBuilder })));
const TextToSpeech = lazy(() => import("./TextToSpeech/TextToSpeech").then((m) => ({ default: m.TextToSpeech })));
const SpeechToText = lazy(() => import("./SpeechToText/SpeechToText").then((m) => ({ default: m.SpeechToText })));
const PdfCompressor = lazy(() => import("./PdfCompressor/PdfCompressor").then((m) => ({ default: m.PdfCompressor })));
const BackgroundRemover = lazy(() => import("./BackgroundRemover/BackgroundRemover").then((m) => ({ default: m.BackgroundRemover })));
const ImageUpscaler = lazy(() => import("./ImageUpscaler/ImageUpscaler").then((m) => ({ default: m.ImageUpscaler })));
const VideoToGif = lazy(() => import("./VideoToGif/VideoToGif").then((m) => ({ default: m.VideoToGif })));
const PdfToText = lazy(() => import("./PdfToText/PdfToText").then((m) => ({ default: m.PdfToText })));
const PdfSigner = lazy(() => import("./PdfSigner/PdfSigner").then((m) => ({ default: m.PdfSigner })));
const InvoiceGenerator = lazy(() => import("./InvoiceGenerator/InvoiceGenerator").then((m) => ({ default: m.InvoiceGenerator })));
const PdfRedactor = lazy(() => import("./PdfRedactor/PdfRedactor").then((m) => ({ default: m.PdfRedactor })));
const PdfSplitter = lazy(() => import("./PdfSplitter/PdfSplitter").then((m) => ({ default: m.PdfSplitter })));
const PdfToImages = lazy(() => import("./PdfToImages/PdfToImages").then((m) => ({ default: m.PdfToImages })));
const PdfFormFiller = lazy(() => import("./PdfFormFiller/PdfFormFiller").then((m) => ({ default: m.PdfFormFiller })));
const BatchWatermarker = lazy(() => import("./BatchWatermarker/BatchWatermarker").then((m) => ({ default: m.BatchWatermarker })));
const WatermarkCropper = lazy(() => import("./WatermarkCropper/WatermarkCropper").then((m) => ({ default: m.WatermarkCropper })));
const BarcodeForge = lazy(() => import("./BarcodeForge/BarcodeForge").then((m) => ({ default: m.BarcodeForge })));
const PassportPhoto = lazy(() => import("./PassportPhoto/PassportPhoto").then((m) => ({ default: m.PassportPhoto })));
const VideoTrimmer = lazy(() => import("./VideoTrimmer/VideoTrimmer").then((m) => ({ default: m.VideoTrimmer })));
const AudioExtractor = lazy(() => import("./AudioExtractor/AudioExtractor").then((m) => ({ default: m.AudioExtractor })));
const ScreenRecorder = lazy(() => import("./ScreenRecorder/ScreenRecorder").then((m) => ({ default: m.ScreenRecorder })));
const BusinessCard = lazy(() => import("./BusinessCard/BusinessCard").then((m) => ({ default: m.BusinessCard })));
const EmailSignature = lazy(() => import("./EmailSignature/EmailSignature").then((m) => ({ default: m.EmailSignature })));
const PasswordVault = lazy(() => import("./PasswordVault/PasswordVault").then((m) => ({ default: m.PasswordVault })));

type ToolCategory = "text" | "code" | "image" | "web" | "pdf" | "media";

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  text: "Text",
  code: "Code",
  image: "Image",
  web: "Web",
  pdf: "PDF",
  media: "Media",
};

interface BuiltinToolEntry {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  status: "live" | "soon";
  category: ToolCategory;
}

const BUILTIN_TOOLS: BuiltinToolEntry[] = [
  {
    id: "svg-viewer",
    category: "image",
    name: "SVG viewer",
    description:
      "Paste any SVG, preview it on paper or checker, zoom in, copy the code, download the file. All in your browser.",
    icon: Shapes,
    status: "live",
  },
  {
    id: "image-converter",
    category: "image",
    name: "Image converter",
    description:
      "SVG, PNG, JPG, WEBP and ICO — convert between any of them with quality and background control. Or trace any image into a clean SVG.",
    icon: ImageDown,
    status: "live",
  },
  {
    id: "json-formatter",
    category: "code",
    name: "JSON formatter",
    description:
      "Paste minified chaos, get readable order. Validate, format, minify — all in your browser, nothing uploaded.",
    icon: Braces,
    status: "live",
  },
  {
    id: "qr-forge",
    category: "web",
    name: "QR forge",
    description:
      "Turn any text or URL into a scannable square. SVG or PNG, any size, with real error correction.",
    icon: QrCode,
    status: "live",
  },
  {
    id: "text-diff",
    category: "text",
    name: "Text diff",
    description:
      "Two texts, one truth. Side-by-side line diff with added, removed and unchanged — computed locally.",
    icon: ArrowLeftRight,
    status: "live",
  },
  {
    id: "id-forge",
    category: "code",
    name: "ID & password forge",
    description:
      "UUIDs, passwords, secrets — minted locally with real cryptographic randomness. Your keys, your tab.",
    icon: Fingerprint,
    status: "live",
  },
  {
    id: "base64",
    category: "code",
    name: "Base64 machine",
    description:
      "Encode and decode between UTF-8, Base64, Base64URL, hex and URL-encoding. All of it, in your tab.",
    icon: Binary,
    status: "live",
  },
  {
    id: "image-crusher",
    category: "image",
    name: "Image crusher",
    description:
      "Smash image file size down to a fraction. Canvas-based re-encode with level control, right in the tab.",
    icon: Gauge,
    status: "live",
  },
  {
    id: "palette-snatcher",
    category: "image",
    name: "Palette snatcher",
    description:
      "Feed it an image, walk away with its color palette. Dominant colors with hex and CSS variables.",
    icon: Palette,
    status: "live",
  },
  {
    id: "markdown-forge",
    category: "text",
    name: "Markdown forge",
    description:
      "Drop Markdown, walk out with HTML. Rendered live with GFM — headers, code blocks, tables, links.",
    icon: FileCode,
    status: "live",
  },
  {
    id: "csv-json",
    category: "code",
    name: "CSV ⇄ JSON",
    description:
      "Both directions, fully in your tab. Quoted fields, commas, the works — no spreadsheet app needed.",
    icon: Table2,
    status: "live",
  },
  {
    id: "sandbox",
    category: "code",
    name: "Mini sandbox",
    description:
      "Write a bit of JavaScript, run it right here. Console output, errors — in a real sandboxed iframe.",
    icon: AppWindow,
    status: "live",
  },
  {
    id: "pdf-joiner",
    category: "pdf",
    name: "PDF joiner",
    description:
      "Stack PDFs, stitch them into one. Reorder, drop, join — all in your browser, nothing uploaded.",
    icon: Paperclip,
    status: "live",
  },
  {
    id: "hasher",
    category: "code",
    name: "Hasher",
    description:
      "Hash any text with SHA-256, SHA-512, SHA-1 and MD5 at once. Web Crypto, right in your tab.",
    icon: Hash,
    status: "live",
  },
  {
    id: "ascii-artist",
    category: "image",
    name: "ASCII artist",
    description:
      "Feed it an image, get back character art — dithering, half-blocks, color modes, and TXT / ANSI / HTML / SVG / PNG export.",
    icon: Brush,
    status: "live",
  },
  {
    id: "link-cleaner",
    category: "web",
    name: "Link cleaner",
    description:
      "Strip tracking params, follow redirect chains, hand you back a clean URL. Your links, degreased.",
    icon: Link2,
    status: "live",
  },
  {
    id: "timestamp",
    category: "code",
    name: "Timestamp converter",
    description:
      "Unix seconds, milliseconds, ISO — convert any timestamp into everything else. Time, decoded.",
    icon: Clock,
    status: "live",
  },
  {
    id: "lorem-generator",
    category: "text",
    name: "Lorem generator",
    description:
      "Lorem ipsum with optional attitude. Paragraphs, sentences or words — minted locally in your tab.",
    icon: TextQuote,
    status: "live",
  },
  {
    id: "color-lab",
    category: "web",
    name: "Color lab",
    description:
      "HEX ⇄ RGB ⇄ HSL ⇄ CMYK, WCAG contrast checks and a shade ladder — all mixed in your tab.",
    icon: Pipette,
    status: "live",
  },
  {
    id: "exif-stripper",
    category: "image",
    name: "EXIF stripper",
    description:
      "Scrub GPS, camera, dates and hidden metadata from your photos. Byte-level surgery in your tab.",
    icon: ShieldCheck,
    status: "live",
  },
  {
    id: "font-pairs",
    category: "web",
    name: "Font pairs",
    description:
      "Preview curated headline + body font pairings with your own copy. Steal the CSS, ship the design.",
    icon: Type,
    status: "live",
  },
  {
    id: "gradient-forge",
    category: "web",
    name: "Gradient forge",
    description:
      "Linear, radial or conic gradients with any stops you like. Mix, preview, copy the CSS.",
    icon: Blend,
    status: "live",
  },
  {
    id: "json-to-ts",
    category: "code",
    name: "JSON → TypeScript",
    description:
      "Paste JSON, walk out with TypeScript interfaces. Nested objects, arrays, unions — typed in your tab.",
    icon: Code2,
    status: "live",
  },
  {
    id: "image-to-pdf",
    category: "pdf",
    name: "Image → PDF",
    description:
      "Stack images, get back a PDF. JPG and PNG embed natively; anything else is converted first.",
    icon: Images,
    status: "live",
  },
  {
    id: "regex-lab",
    category: "code",
    name: "Regex lab",
    description:
      "Write a pattern, watch it hunt. Live highlighting, match counts, capture groups — all in your tab.",
    icon: Regex,
    status: "live",
  },
  {
    id: "case-converter",
    category: "text",
    name: "Case converter",
    description:
      "camelCase, snake_case, kebab-case, l33t — every case your codebase demands, converted live in your tab.",
    icon: CaseSensitive,
    status: "live",
  },
  {
    id: "text-stats",
    category: "text",
    name: "Text stats",
    description:
      "Words, characters, reading time and top keywords — every number about your text, counted on-device.",
    icon: BarChart3,
    status: "live",
  },
  {
    id: "morse",
    category: "text",
    name: "Morse code",
    description:
      "Text to Morse and back, with real beeping. Dots, dashes and the full chart — synthesized in your tab.",
    icon: AudioWaveform,
    status: "live",
  },
  {
    id: "ascii-table",
    category: "code",
    name: "ASCII table",
    description:
      "Every character 0–255 with its hex, binary and HTML entity — the full code book, searchable.",
    icon: Terminal,
    status: "live",
  },
  {
    id: "unit-converter",
    category: "code",
    name: "Unit converter",
    description:
      "Length, mass, temperature, data, time, area, volume, speed — exact factors, instant answers.",
    icon: Ruler,
    status: "live",
  },
  {
    id: "image-resizer",
    category: "image",
    name: "Image resizer",
    description:
      "Resize images to exact pixels or a percentage, keep the ratio or don't — PNG, JPG, WEBP out.",
    icon: Crop,
    status: "live",
  },
  {
    id: "password-tester",
    category: "code",
    name: "Password tester",
    description:
      "Entropy, crack time and a fix list for any password — interrogated in your tab, never sent.",
    icon: ShieldAlert,
    status: "live",
  },
  {
    id: "subnet-calculator",
    category: "code",
    name: "Subnet calculator",
    description:
      "IP + CIDR in, network, broadcast, host range and mask bits out. Subnet math solved locally.",
    icon: Network,
    status: "live",
  },
  {
    id: "data-uri",
    category: "code",
    name: "Data URI generator",
    description:
      "Turn any small file into a data: URI for HTML, CSS or URLs — embedded, base64, done.",
    icon: FileCode2,
    status: "live",
  },
  {
    id: "cron-builder",
    category: "code",
    name: "Cron builder",
    description:
      "Build cron expressions visually with presets, and see the next five real run times.",
    icon: CalendarClock,
    status: "live",
  },
  {
    id: "http-status",
    category: "web",
    name: "HTTP status",
    description:
      "Every status code decoded — 402 is the paywall one, 451 is the censorship one, 418 is a teapot.",
    icon: Globe,
    status: "live",
  },
  {
    id: "yaml-json",
    category: "code",
    name: "YAML ⇄ JSON",
    description:
      "YAML to JSON, JSON to YAML — a practical subset parser, hand-rolled, running entirely in your tab.",
    icon: FileJson,
    status: "live",
  },
  {
    id: "resume-builder",
    category: "pdf",
    name: "Resume builder",
    description:
      "MIT-style editorial templates with the right fonts for your field. Build it, print it to PDF — no download wall, no watermarks.",
    icon: FileText,
    status: "live",
  },
  {
    id: "text-to-speech",
    category: "web",
    name: "Text to speech",
    description:
      "Unlimited TTS in your browser — voices, speed, pitch. No minute-metered tiers, no credits, no account.",
    icon: Volume2,
    status: "live",
  },
  {
    id: "speech-to-text",
    category: "web",
    name: "Speech to text",
    description:
      "Live dictation straight to text, transcribed in your tab. No monthly minute cap, nothing uploaded.",
    icon: Mic,
    status: "live",
  },
  {
    id: "pdf-compressor",
    category: "pdf",
    name: "PDF compressor",
    description:
      "Shrink PDFs with DPI and quality control — rendered locally, unlimited runs, no daily-task quota.",
    icon: FileDown,
    status: "live",
  },
  {
    id: "background-remover",
    category: "image",
    name: "Background remover",
    description:
      "Cut solid backgrounds to transparent with tolerance control — unlimited previews and PNG exports, no credit packs.",
    icon: Scissors,
    status: "live",
  },
  {
    id: "image-upscaler",
    category: "image",
    name: "Image upscaler",
    description:
      "Lanczos step-scaling plus unsharp sharpening up to 8× — unlimited, free, with no expiring credit tokens.",
    icon: ZoomIn,
    status: "live",
  },
  {
    id: "video-gif",
    category: "image",
    name: "Video → GIF maker",
    description:
      "Cut a clip from any video and export it as a GIF — trim, FPS and width control, encoded frame-by-frame in your tab. No watermark, no 30-minute cap, no 3-day storage.",
    icon: Clapperboard,
    status: "live",
  },
  {
    id: "pdf-to-text",
    category: "pdf",
    name: "PDF → text",
    description:
      "Pull every word out of a PDF, page by page. Copy it or save as .txt / .md — no 20-page preview caps, nothing ever uploaded.",
    icon: ScrollText,
    status: "live",
  },
  {
    id: "pdf-signer",
    category: "pdf",
    name: "PDF signer",
    description:
      "Draw or type a signature, pick the page and spot, download the signed PDF. The part DocuSign charges a subscription for.",
    icon: PenLine,
    status: "live",
  },
  {
    id: "invoice-generator",
    category: "pdf",
    name: "Invoice generator",
    description:
      "Line items, tax, discount, notes — a clean brutalist invoice PDF generated locally. No counting your 3 free invoices a month.",
    icon: Receipt,
    status: "live",
  },
  {
    id: "pdf-redactor",
    category: "pdf",
    name: "PDF redactor",
    description:
      "Drag black boxes over the sensitive bits of any PDF page and download it with them burned in — the part the redaction SaaS charges per page for.",
    icon: Eraser,
    status: "live",
  },
  {
    id: "pdf-splitter",
    category: "pdf",
    name: "PDF splitter & extractor",
    description:
      "See every page as a thumbnail, pick the ones you want, get a new PDF — or split one PDF into many by range. No upload, no page-fee.",
    icon: Scissors,
    status: "live",
  },
  {
    id: "pdf-images",
    category: "pdf",
    name: "PDF → images",
    description:
      "Render any PDF into PNG, JPEG or WebP at your DPI of choice — per page or all at once. The converter sites cap you at five pages and blur the rest.",
    icon: Images,
    status: "live",
  },
  {
    id: "pdf-form-filler",
    category: "pdf",
    name: "PDF form filler",
    description:
      "Fill text fields, checkboxes, radios, dropdowns and option lists in any PDF form and download it flattened — no free-3-fills-a-month trap.",
    icon: FileInput,
    status: "live",
  },
  {
    id: "batch-watermarker",
    category: "image",
    name: "Batch watermarker",
    description:
      "Stamp a watermark across a whole folder of images at once — tile or corner, opacity and size sliders, live preview, batch PNG download.",
    icon: Stamp,
    status: "live",
  },
  {
    id: "watermark-cropper",
    category: "image",
    name: "Watermark cropper",
    description:
      "Zoom into the watermarked corner of an image, crop it out, download the clean result. The 'remove watermark' apps bill you per photo; a crop is free.",
    icon: Crop,
    status: "live",
  },
  {
    id: "barcode-forge",
    category: "code",
    name: "Barcode forge",
    description:
      "Real EAN-13, UPC-A, Code 128 and Code 39 barcodes with validated checksums — SVG or PNG at any scale. The paid generators hide high-res behind paywalls.",
    icon: Barcode,
    status: "live",
  },
  {
    id: "passport-photo",
    category: "image",
    name: "Passport photo",
    description:
      "Crop to a real passport ratio, scrub the background to white, print a 6-up A4 sheet. The passport-photo apps charge per print; the crop is the only math involved.",
    icon: IdCard,
    status: "live",
  },
  {
    id: "video-trimmer",
    category: "media",
    name: "Video trimmer",
    description:
      "Cut a video down to just the part you need — preview, trim, capture, done. The cloud trimmers upload your file and charge for the privilege.",
    icon: Film,
    status: "live",
  },
  {
    id: "audio-extractor",
    category: "media",
    name: "Audio extractor & trimmer",
    description:
      "Pull the audio out of any video and cut it to the exact moment — clean 48 kHz WAV, rendered offline. No queue, no caps, no watermark.",
    icon: Music,
    status: "live",
  },
  {
    id: "screen-recorder",
    category: "media",
    name: "Screen recorder",
    description:
      "Record your screen, tab audio and mic — locally, straight to WebM. The loom-adjacent companies give you 25 videos and a watermark for a reason.",
    icon: MonitorPlay,
    status: "live",
  },
  {
    id: "business-card",
    category: "image",
    name: "Business card maker",
    description:
      "A 90×50 mm brutalist business card, live-rendered and exported at print resolution. The card-printing sites charge per card and watermark the preview.",
    icon: CreditCard,
    status: "live",
  },
  {
    id: "email-signature",
    category: "web",
    name: "Email signature generator",
    description:
      "Table markup email clients actually render — not a screenshot. The 'pro signature' sites charge monthly for this exact table with a tracking pixel added.",
    icon: Mail,
    status: "live",
  },
  {
    id: "password-vault",
    category: "code",
    name: "Password vault + TOTP",
    description:
      "A local, encrypted vault for passwords and 2FA codes — AES-GCM on your machine, with live TOTP codes. The password managers sync your secrets to their cloud and bill you.",
    icon: KeyRound,
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
  "case-converter": () => <CaseConverter />,
  "text-stats": () => <TextStats />,
  morse: () => <Morse />,
  "ascii-table": () => <AsciiTable />,
  "unit-converter": () => <UnitConverter />,
  "image-resizer": () => <ImageResizer />,
  "password-tester": () => <PasswordTester />,
  "subnet-calculator": () => <SubnetCalculator />,
  "data-uri": () => <DataUriGenerator />,
  "cron-builder": () => <CronBuilder />,
  "http-status": () => <HttpStatus />,
  "yaml-json": () => <YamlJson />,
  "resume-builder": () => <ResumeBuilder />,
  "text-to-speech": () => <TextToSpeech />,
  "speech-to-text": () => <SpeechToText />,
  "pdf-compressor": () => <PdfCompressor />,
  "background-remover": () => <BackgroundRemover />,
  "image-upscaler": () => <ImageUpscaler />,
  "video-gif": () => <VideoToGif />,
  "pdf-to-text": () => <PdfToText />,
  "pdf-signer": () => <PdfSigner />,
  "invoice-generator": () => <InvoiceGenerator />,
  "pdf-redactor": () => <PdfRedactor />,
  "pdf-splitter": () => <PdfSplitter />,
  "pdf-images": () => <PdfToImages />,
  "pdf-form-filler": () => <PdfFormFiller />,
  "batch-watermarker": () => <BatchWatermarker />,
  "watermark-cropper": () => <WatermarkCropper />,
  "barcode-forge": () => <BarcodeForge />,
  "passport-photo": () => <PassportPhoto />,
  "video-trimmer": () => <VideoTrimmer />,
  "audio-extractor": () => <AudioExtractor />,
  "screen-recorder": () => <ScreenRecorder />,
  "business-card": () => <BusinessCard />,
  "email-signature": () => <EmailSignature />,
  "password-vault": () => <PasswordVault />,
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
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                INDEX / TOOLS
              </p>
              <h1 className="mt-2 font-display text-[clamp(2.5rem,7vw,5rem)] font-bold uppercase leading-[0.95] tracking-tight">
                Loading…
              </h1>
              <div className="brick-strip-animated mt-10 h-4 w-full rounded-md border-2 border-ink" />
              <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/50">
                Fetching the tool — only what you clicked, nothing more
              </p>
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategory | "all">("all");

  const counts = useMemo(() => {
    const c = { all: BUILTIN_TOOLS.length } as Record<ToolCategory | "all", number>;
    for (const t of BUILTIN_TOOLS) c[t.category] = (c[t.category] ?? 0) + 1;
    return c;
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BUILTIN_TOOLS.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (q && !`${t.name} ${t.description} ${t.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, category]);

  return (
    <main className="py-6" id="main-content">
      <div className="page-container">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/60">
              INDEX / TOOLS
            </p>
            <h1 className="mt-0.5 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold uppercase leading-[0.95] tracking-tight">
              The arsenal.
            </h1>
          </div>
          <p className="max-w-md text-[13px] font-medium text-ink/80">
            Built-in tools. No account. No email. No walls. Open a tool and it works — right here, in your
            browser.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border-[3px] border-ink bg-surface p-2.5 shadow-brutal-md">
          <div className="flex min-w-56 flex-1 items-center gap-1.5 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 focus-within:border-yellow">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink/50" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Try "qr", "json", "pdf"…`}
              className="w-full bg-transparent font-mono text-[11px] font-bold uppercase tracking-widest text-ink outline-none placeholder:text-ink/30"
              aria-label="Search tools"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 rounded-md border-2 border-ink px-1 font-mono text-[10px] font-bold text-ink transition-colors duration-200 ease-brutal hover:bg-red"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "text", "code", "image", "web", "pdf", "media"] as const).map((cat) => {
              const label = cat === "all" ? "All" : CATEGORY_LABELS[cat];
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border-2 border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                    active
                      ? "bg-ink text-surface shadow-brutal-sm"
                      : "bg-surface-muted text-ink/70 hover:bg-yellow/30",
                  )}
                >
                  {label}
                  <span className={active ? "text-yellow" : "text-ink/40"}>{counts[cat]}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => showModalWithID("suggest-tool")}
            className="flex items-center gap-1.5 rounded-md border-2 border-dashed border-ink/60 bg-transparent px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-[background-color,border-color] duration-200 ease-brutal hover:border-ink hover:bg-surface-muted"
          >
            <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" /> Your idea here →
          </button>
        </div>

        {query && (
          <p className="mt-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
            {visible.length === 0
              ? "No matches — try another word"
              : `${visible.length} tool${visible.length === 1 ? "" : "s"} match${visible.length === 1 ? "es" : ""} "${query.trim()}"`}
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((tool, i) => (
            <a
              key={tool.id}
              href={`#/tools/${tool.id}`}
              target="_self"
              className="group relative flex min-h-[210px] flex-col gap-3 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md transition-[transform,box-shadow] duration-200 ease-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm"
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

          {visible.length === 0 && (
            <p className="rounded-lg border-[3px] border-dashed border-ink/60 p-5 font-mono text-xs font-bold uppercase tracking-widest text-ink/50 sm:col-span-2 xl:col-span-3">
              No tools match — try another word
            </p>
          )}
        </div>
      </div>

      <BrickWall className="mt-14" />
    </main>
  );
}