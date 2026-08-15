import { useMemo, useState } from "react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

type Status = { code: number; name: string; description: string };

const STATUSES: Status[] = [
  { code: 100, name: "Continue", description: "Server got the headers, keep going with the request body." },
  { code: 101, name: "Switching Protocols", description: "Server is switching protocols (usually WebSocket upgrade)." },
  { code: 102, name: "Processing", description: "Server is still processing, no response yet." },
  { code: 103, name: "Early Hints", description: "Server sends some headers before the final response." },
  { code: 200, name: "OK", description: "The request succeeded." },
  { code: 201, name: "Created", description: "Request succeeded and a resource was created." },
  { code: 202, name: "Accepted", description: "Request accepted, processing may not be done yet." },
  { code: 203, name: "Non-Authoritative Information", description: "Response came from a third party, not the origin server." },
  { code: 204, name: "No Content", description: "Success but there's nothing to send back." },
  { code: 205, name: "Reset Content", description: "Tell the browser to clear the form that sent this." },
  { code: 206, name: "Partial Content", description: "Range request — you got part of the file." },
  { code: 207, name: "Multi-Status", description: "WebDAV — multiple statuses for multiple resources." },
  { code: 226, name: "IM Used", description: "Server used the IM protocol for delta encoding." },
  { code: 300, name: "Multiple Choices", description: "Multiple representations, pick one." },
  { code: 301, name: "Moved Permanently", description: "The URL has permanently moved. Update your links." },
  { code: 302, name: "Found", description: "Temporary redirect — the URL moved but might come back." },
  { code: 303, name: "See Other", description: "GET the result at a different URL." },
  { code: 304, name: "Not Modified", description: "Cache is still fresh — use what you have." },
  { code: 305, name: "Use Proxy", description: "Deprecated — must go through a proxy." },
  { code: 307, name: "Temporary Redirect", description: "Like 302 but keeps method and body." },
  { code: 308, name: "Permanent Redirect", description: "Like 301 but keeps method and body." },
  { code: 400, name: "Bad Request", description: "The request itself is malformed." },
  { code: 401, name: "Unauthorized", description: "You need to authenticate first." },
  { code: 402, name: "Payment Required", description: "Reserved. The OG paywall joke — not actually used." },
  { code: 403, name: "Forbidden", description: "Understood but denied. No auth will help you." },
  { code: 404, name: "Not Found", description: "Nothing at that URL. The classic." },
  { code: 405, name: "Method Not Allowed", description: "Right URL, wrong HTTP method." },
  { code: 406, name: "Not Acceptable", description: "Server can't match your Accept headers." },
  { code: 407, name: "Proxy Authentication Required", description: "Authenticate with the proxy first." },
  { code: 408, name: "Request Timeout", description: "Server gave up waiting for the full request." },
  { code: 409, name: "Conflict", description: "Request clashes with the resource's current state." },
  { code: 410, name: "Gone", description: "Resource existed but is gone for good. No redirect." },
  { code: 411, name: "Length Required", description: "Content-Length header missing." },
  { code: 412, name: "Precondition Failed", description: "Your conditional headers failed the check." },
  { code: 413, name: "Payload Too Large", description: "The body is too big for the server." },
  { code: 414, name: "URI Too Long", description: "The URL itself is too long." },
  { code: 415, name: "Unsupported Media Type", description: "Server doesn't understand that content type." },
  { code: 416, name: "Range Not Satisfiable", description: "That byte range is outside the file." },
  { code: 417, name: "Expectation Failed", description: "The Expect header couldn't be honored." },
  { code: 418, name: "I'm a Teapot", description: "The server is a teapot. RFC 2324, forever." },
  { code: 421, name: "Misdirected Request", description: "Request sent to a server that can't answer it." },
  { code: 422, name: "Unprocessable Content", description: "Syntax is fine but the content doesn't work." },
  { code: 423, name: "Locked", description: "WebDAV — the resource is locked." },
  { code: 424, name: "Failed Dependency", description: "WebDAV — a previous request it depended on failed." },
  { code: 425, name: "Too Early", description: "Server won't process it yet — TLS 0-RTT concerns." },
  { code: 426, name: "Upgrade Required", description: "Switch protocols first, then resend." },
  { code: 428, name: "Precondition Required", description: "Send conditional headers to avoid lost updates." },
  { code: 429, name: "Too Many Requests", description: "Rate limited. Slow down or face the wall." },
  { code: 431, name: "Request Header Fields Too Large", description: "Too many or too long headers." },
  { code: 451, name: "Unavailable For Legal Reasons", description: "Blocked by law. The censorship status code." },
  { code: 500, name: "Internal Server Error", description: "Something broke server-side, no details given." },
  { code: 501, name: "Not Implemented", description: "The server doesn't know that method." },
  { code: 502, name: "Bad Gateway", description: "An upstream server gave a bad answer." },
  { code: 503, name: "Service Unavailable", description: "Down for now — maintenance or overload." },
  { code: 504, name: "Gateway Timeout", description: "Upstream took too long to answer." },
  { code: 505, name: "HTTP Version Not Supported", description: "The server doesn't speak that HTTP version." },
  { code: 506, name: "Variant Also Negotiates", description: "Configuration error in content negotiation." },
  { code: 507, name: "Insufficient Storage", description: "WebDAV — the server is out of storage." },
  { code: 508, name: "Loop Detected", description: "WebDAV — infinite loop in the request processing." },
  { code: 510, name: "Not Extended", description: "More extensions required for the request." },
  { code: 511, name: "Network Authentication Required", description: "Authenticate to the network before the site." },
];

const CLASSES = [
  { id: "1xx", label: "Informational", color: "bg-blue" },
  { id: "2xx", label: "Success", color: "bg-green" },
  { id: "3xx", label: "Redirection", color: "bg-yellow" },
  { id: "4xx", label: "Client error", color: "bg-red" },
  { id: "5xx", label: "Server error", color: "bg-red" },
];

export function HttpStatus() {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STATUSES.filter((s) => {
      const inClass =
        !classFilter ||
        (s.code >= Number(classFilter[0]) * 100 && s.code < (Number(classFilter[0]) + 1) * 100);
      const inQuery =
        !q ||
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q);
      return inClass && inQuery;
    });
  }, [query, classFilter]);

  const badge = (code: number) => {
    const cls = code < 300 ? "bg-blue" : code < 400 ? "bg-yellow" : "bg-red";
    return cls;
  };

  return (
    <ToolShell
      crumb="HTTP-STATUS"
      title="The diplomat."
      tagline="Every HTTP status code decoded — 402 is the paywall one, 451 is the censorship one, 418 is a teapot."
    >
      <div className="mt-10 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            placeholder="Search code, name or description…"
            className="min-w-0 flex-1 rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-sm text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="flex flex-wrap gap-2">
            {CLASSES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClassFilter(classFilter === c.id ? null : c.id)}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color] duration-200 ease-brutal",
                  classFilter === c.id ? cn("text-ink shadow-brutal-sm", c.color) : "bg-surface-muted hover:bg-yellow/30",
                )}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {filtered.map((s) => (
            <li key={s.code} className="rounded-md border-2 border-ink bg-surface-muted p-3">
              <div className="flex items-center gap-2">
                <span className={cn("rounded-sm border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold text-ink", badge(s.code))}>
                  {s.code}
                </span>
                <p className="truncate font-mono text-xs font-bold uppercase tracking-wide text-ink">{s.name}</p>
              </div>
              <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink/60">{s.description}</p>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="col-span-full rounded-md border-2 border-ink bg-surface-muted px-3 py-8 text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
              No status matches "{query}"
            </li>
          )}
        </ul>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        The complete common set, on-device — no network call needed to explain a network call.
      </p>
    </ToolShell>
  );
}