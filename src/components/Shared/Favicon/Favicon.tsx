import { useState } from "react";
import { cn } from "../../../utils/cn";

interface FaviconProps {
  url: string;
  name: string;
  imgClassName?: string;
  fallbackClassName?: string;
}

function getHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0].split("?")[0];
  }
}

export function Favicon({ url, name, imgClassName, fallbackClassName }: FaviconProps) {
  const host = getHost(url);
  const [failed, setFailed] = useState(false);

  const fallbackChar = (name.trim()[0] ?? "?").toUpperCase();

  if (!host || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center bg-yellow font-display font-bold text-ink",
          fallbackClassName,
        )}
      >
        {fallbackChar}
      </span>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={imgClassName}
    />
  );
}