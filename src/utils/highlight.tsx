import { Fragment } from "react";
import type { ReactNode } from "react";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Wraps every case-insensitive occurrence of any keyword in <mark>. Keywords
// match as substrings (so "editor" highlights inside "video-editor"), same
// rule the search scorer uses.
export function highlightMatches(text: string, keywords: string[]): ReactNode {
  if (keywords.length === 0 || !text) return text;

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return parts.map((part, i) =>
    lowerKeywords.includes(part.toLowerCase()) ? (
      <mark key={i} className="keyword-highlight">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
