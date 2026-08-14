import { useState } from "react";
import { AlertCircle, ExternalLink, Star } from "lucide-react";
import { useModal } from "../../../../hooks/useModal";
import { useReport } from "../../../../hooks/useReport";
import type { Category, Tool } from "../../../../types";
import { formatStars } from "../../../../utils/formatters";
import { highlightMatches } from "../../../../utils/highlight";
import { Toast } from "../../../Shared/Feedback/Toast/Toast";
import { Favicon } from "../../../Shared/Favicon/Favicon";
import { Badge } from "../../../ui/badge";
import { cn } from "../../../../utils/cn";

interface ToolCardProps {
  tool: Tool;
  category: Category | undefined;
  searchKeywords?: string[];
  setSearchQuery: (query: string) => void;
  index?: number;
}

export function ToolCard({
  tool,
  category,
  searchKeywords = [],
  setSearchQuery,
  index,
}: ToolCardProps) {
  const cat: Pick<Category, "icon" | "name"> = category ?? {
    icon: "◉",
    name: tool.category,
  };
  const { reportMode } = useReport();
  const { showModalWithID } = useModal();
  const [toastVisible, setToastVisible] = useState(false);

  function handleReport(tool: Tool) {
    showModalWithID("report-tool", { toolId: tool.id });
  }

  function handleTimedToast() {
    setToastVisible(!toastVisible);

    if (!toastVisible) {
      setTimeout(() => {
        setToastVisible(false);
      }, 2000);
    }
  }

  return (
    <>
      {toastVisible && tool.notRecommendedReason !== undefined && (
        <Toast
          innerText={tool.notRecommendedReason}
          onExit={() => setToastVisible(false)}
        />
      )}
      <article
        className={cn(
          "group relative flex min-h-[220px] cursor-pointer flex-col gap-3 rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-md transition-[transform,box-shadow] duration-200 ease-brutal hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm",
          tool.section === "featured" && "bg-[#fff6d6]",
          tool.notRecommendedReason !== undefined && "opacity-60",
          reportMode && "card-shake shadow-brutal-sm",
        )}
        data-highlighted={reportMode}
        onClick={() =>
          reportMode
            ? handleReport(tool)
            : window.open(tool.url, "_blank", "noopener,noreferrer")
        }
      >
        {index !== undefined && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 font-mono text-[10px] font-semibold text-ink/30"
          >
            {String(index).padStart(3, "0")}
          </span>
        )}

        <div className="flex items-start justify-between gap-3 pr-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 select-none items-center justify-center overflow-hidden rounded-md border-2 border-ink bg-surface shadow-brutal-sm"
            >
              <Favicon
                url={tool.url}
                name={tool.name}
                imgClassName="h-7 w-7 object-contain"
                fallbackClassName="h-full w-full text-lg"
              />
            </span>
            <div className="flex flex-col gap-1">
              <a
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-display text-xl font-bold leading-tight tracking-tight text-ink underline-offset-4 hover:underline"
              >
                {highlightMatches(tool.name, searchKeywords)}
                <ExternalLink
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                />
              </a>
              {tool.notRecommendedReason !== undefined && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTimedToast();
                  }}
                  title={tool.notRecommendedReason}
                  aria-label={`Why this tool is not recommended: ${tool.notRecommendedReason}`}
                  className="flex w-fit cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent p-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-red hover:underline"
                >
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  not recommended
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-1.5">
            {tool.flag === "abandoned" && (
              <Badge variant="outline" title="This project is no longer maintained">
                Abandoned
              </Badge>
            )}
            {tool.section === "editors-pick" && (
              <Badge variant="blue">Editor&apos;s Pick</Badge>
            )}
            {tool.section === "featured" && <Badge variant="red">Featured</Badge>}
            {tool.flag === "new" && (
              <Badge variant="green" title="Brand new project">
                New
              </Badge>
            )}
          </div>
        </div>

        <p className="text-[15px] leading-relaxed text-ink/85">
          {highlightMatches(tool.description, searchKeywords)}
        </p>

        <ul className="flex flex-wrap gap-1.5">
          {tool.tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                className="cursor-pointer rounded-sm border-2 border-ink bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-ink transition-[transform,background-color] duration-150 ease-brutal hover:-translate-y-[1px] hover:bg-yellow active:translate-y-0"
                aria-label={`Filter tools by ${tag.replace(/-/g, " ")}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery(tag);
                }}
              >
                #{highlightMatches(tag, searchKeywords)}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-3 border-t-2 border-ink pt-3">
          <div className="flex items-center gap-3">
            <span className="rounded-sm border-2 border-ink bg-surface-muted px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider">
              {cat.icon} {cat.name}
            </span>
            {!!tool.stars && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-ink/70">
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                {formatStars(tool.stars)}
              </span>
            )}
          </div>

          {tool.github ? (
            <a
              href={tool.github}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-ink underline-offset-2 hover:underline"
              title={`View ${tool.name} repository on GitHub`}
              aria-label={`View ${tool.name} repository on GitHub`}
            >
              <GithubMark className="h-3.5 w-3.5" aria-hidden="true" />
              {tool.license ?? "SRC"}
            </a>
          ) : (
            <span className="font-mono text-[11px] font-semibold text-ink/40">
              WEB_ONLY
            </span>
          )}
        </div>
      </article>
    </>
  );
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3.005-.41 1.02.005 2.04.135 3.005.41 2.28-1.545 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.92.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}