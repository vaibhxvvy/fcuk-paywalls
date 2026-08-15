import { useMemo, useState } from "react";
import { Network } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";

function parseIp(s: string): number[] | null {
  const parts = s.trim().split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!/^\d{1,3}$/.test(p) || n < 0 || n > 255) return null;
    octets.push(n);
  }
  return octets;
}

function ipToString(ip: number): string {
  return [(ip >>> 24) & 255, (ip >>> 16) & 255, (ip >>> 8) & 255, ip & 255].join(".");
}

function ipToBits(ip: number[]): number {
  return ((ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3]) >>> 0;
}

export function SubnetCalculator() {
  const [ipStr, setIpStr] = useState("192.168.1.0");
  const [prefixStr, setPrefixStr] = useState("24");

  const result = useMemo(() => {
    const ip = parseIp(ipStr);
    const prefix = Number(prefixStr);
    if (!ip || !/^\d{1,2}$/.test(prefixStr) || prefix < 0 || prefix > 32) return null;

    const ipBits = ipToBits(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = ipBits & mask;
    const broadcast = network | ~mask;
    const hosts = prefix === 32 ? 1 : Math.max(0, 2 ** (32 - prefix) - 2);
    const firstHost = prefix >= 31 ? network : network + 1;
    const lastHost = prefix >= 31 ? (prefix === 32 ? network : network + 1) : broadcast - 1;
    const usableCount = prefix >= 31 ? 2 ** (32 - prefix) : hosts;

    return {
      prefix,
      mask: ipToString(mask),
      network: ipToString(network),
      broadcast: ipToString(broadcast),
      first: ipToString(firstHost),
      last: ipToString(lastHost),
      hosts,
      usable: usableCount,
      maskBits: [24, 16, 8, 0].map((s) => (mask >>> s) & 255),
    };
  }, [ipStr, prefixStr]);

  return (
    <ToolShell
      crumb="SUBNET-CALCULATOR"
      title="The slicer."
      tagline="IP + CIDR in, network, broadcast, host range and wildcard out. Subnet math, solved in your tab."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The network
            <Network className="h-4 w-4" aria-hidden="true" />
          </h2>
          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">IP address</span>
            <input
              value={ipStr}
              onChange={(e) => setIpStr(e.target.value)}
              spellCheck={false}
              inputMode="decimal"
              className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5 font-mono text-base font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          </label>
          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Prefix (/CIDR)</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                value={prefixStr}
                onChange={(e) => setPrefixStr(e.target.value)}
                spellCheck={false}
                inputMode="numeric"
                className="w-24 rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5 font-mono text-base font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
              />
              <input
                type="range"
                min={0}
                max={32}
                value={prefixStr}
                onChange={(e) => setPrefixStr(e.target.value)}
                className="flex-1 accent-yellow"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[8, 16, 24, 28, 30, 32].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrefixStr(String(p))}
                  className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[10px] font-bold text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
                >
                  /{p}
                </button>
              ))}
            </div>
          </label>

          {result && (
            <div className="mt-4 rounded-md border-2 border-ink bg-ink p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/60">Mask bits</p>
              <p className="font-mono text-sm font-bold text-green">
                {result.maskBits.map((b) => b.toString(2).padStart(8, "0")).join(".")}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The slices</h2>
          {result ? (
            <>
              <ul className="mt-4 space-y-2">
                {(
                  [
                    ["Network", result.network],
                    ["Broadcast", result.broadcast],
                    ["Subnet mask", result.mask],
                    ["First usable", result.first],
                    ["Last usable", result.last],
                  ] as const
                ).map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">{label}</p>
                    <p className="font-mono text-xs font-bold text-ink">{value}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border-2 border-ink bg-surface-muted p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Total addresses</p>
                  <p className="mt-1 font-mono text-lg font-bold text-ink">{(2 ** (32 - result.prefix)).toLocaleString()}</p>
                </div>
                <div className="rounded-md border-2 border-ink bg-surface-muted p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Usable hosts</p>
                  <p className="mt-1 font-mono text-lg font-bold text-ink">{result.usable.toLocaleString()}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-6 text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
                Enter a valid IP and a prefix (0–32)
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        /31 and /32 point-to-point links get their special treatment — computed locally.
      </p>
    </ToolShell>
  );
}