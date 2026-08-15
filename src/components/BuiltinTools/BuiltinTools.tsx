import { Shapes, Lightbulb, ImageDown } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { Badge } from "../ui/badge";
import { BrickWall } from "../decoration/BrickWall";
import { SvgViewer } from "./SvgViewer/SvgViewer";
import { ImageConverter } from "./ImageConverter/ImageConverter";

interface BuiltinToolEntry {
  id: string;
  name: string;
  description: string;
  icon: typeof Shapes;
  status: "live" | "soon";
}

const BUILTIN_TOOLS: BuiltinToolEntry[] = [
  {
    id: "svg-viewer",
    name: "SVG VIEWER",
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
];

interface BuiltinToolsProps {
  route: string;
}

export function BuiltinTools({ route }: BuiltinToolsProps) {
  if (route.startsWith("/tools/svg-viewer")) return <SvgViewer />;
  if (route.startsWith("/tools/image-converter")) return <ImageConverter />;

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