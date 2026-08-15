import { useMemo, useState } from "react";
import { Ruler, Repeat } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

type UnitGroup = {
  id: string;
  label: string;
  units: { id: string; label: string; factor: number; offset?: number }[];
  special?: (v: number, toId: string) => number | null;
};

const GROUPS: UnitGroup[] = [
  {
    id: "length",
    label: "Length",
    units: [
      { id: "mm", label: "Millimetre", factor: 0.001 },
      { id: "cm", label: "Centimetre", factor: 0.01 },
      { id: "m", label: "Metre", factor: 1 },
      { id: "km", label: "Kilometre", factor: 1000 },
      { id: "in", label: "Inch", factor: 0.0254 },
      { id: "ft", label: "Foot", factor: 0.3048 },
      { id: "yd", label: "Yard", factor: 0.9144 },
      { id: "mi", label: "Mile", factor: 1609.344 },
      { id: "nmi", label: "Nautical mile", factor: 1852 },
    ],
  },
  {
    id: "mass",
    label: "Mass",
    units: [
      { id: "mg", label: "Milligram", factor: 0.001 },
      { id: "g", label: "Gram", factor: 1 },
      { id: "kg", label: "Kilogram", factor: 1000 },
      { id: "t", label: "Tonne", factor: 1_000_000 },
      { id: "oz", label: "Ounce", factor: 28.349523125 },
      { id: "lb", label: "Pound", factor: 453.59237 },
      { id: "st", label: "Stone", factor: 6350.29318 },
    ],
  },
  {
    id: "temp",
    label: "Temperature",
    units: [
      { id: "c", label: "Celsius", factor: 1 },
      { id: "f", label: "Fahrenheit", factor: 1 },
      { id: "k", label: "Kelvin", factor: 1 },
    ],
    special: (v, toId) => {
      const toK =
        toId === "c" ? v + 273.15 : toId === "f" ? ((v - 32) * 5) / 9 + 273.15 : v;
      return toId === "c" ? toK - 273.15 : toId === "f" ? ((toK - 273.15) * 9) / 5 + 32 : toK;
    },
  },
  {
    id: "data",
    label: "Data",
    units: [
      { id: "b", label: "Bit", factor: 0.125 },
      { id: "B", label: "Byte", factor: 1 },
      { id: "kb", label: "Kilobyte", factor: 1024 },
      { id: "mb", label: "Megabyte", factor: 1024 ** 2 },
      { id: "gb", label: "Gigabyte", factor: 1024 ** 3 },
      { id: "tb", label: "Terabyte", factor: 1024 ** 4 },
      { id: "pb", label: "Petabyte", factor: 1024 ** 5 },
      { id: "kbit", label: "Kilobit", factor: 125 },
      { id: "mbit", label: "Megabit", factor: 125_000 },
      { id: "gbit", label: "Gigabit", factor: 125_000_000 },
    ],
  },
  {
    id: "time",
    label: "Time",
    units: [
      { id: "ms", label: "Millisecond", factor: 0.001 },
      { id: "s", label: "Second", factor: 1 },
      { id: "min", label: "Minute", factor: 60 },
      { id: "h", label: "Hour", factor: 3600 },
      { id: "d", label: "Day", factor: 86_400 },
      { id: "w", label: "Week", factor: 604_800 },
      { id: "mo", label: "Month (30d)", factor: 2_592_000 },
      { id: "y", label: "Year (365d)", factor: 31_536_000 },
    ],
  },
  {
    id: "area",
    label: "Area",
    units: [
      { id: "cm2", label: "cm²", factor: 0.0001 },
      { id: "m2", label: "m²", factor: 1 },
      { id: "ha", label: "Hectare", factor: 10_000 },
      { id: "km2", label: "km²", factor: 1_000_000 },
      { id: "in2", label: "in²", factor: 0.00064516 },
      { id: "ft2", label: "ft²", factor: 0.09290304 },
      { id: "ac", label: "Acre", factor: 4046.8564224 },
    ],
  },
  {
    id: "volume",
    label: "Volume",
    units: [
      { id: "ml", label: "Millilitre", factor: 0.001 },
      { id: "l", label: "Litre", factor: 1 },
      { id: "m3", label: "m³", factor: 1000 },
      { id: "tsp", label: "Teaspoon", factor: 0.00492892 },
      { id: "tbsp", label: "Tablespoon", factor: 0.0147868 },
      { id: "cup", label: "US cup", factor: 0.236588 },
      { id: "floz", label: "Fluid ounce", factor: 0.0295735 },
      { id: "pt", label: "US pint", factor: 0.473176 },
      { id: "gal", label: "US gallon", factor: 3.78541 },
    ],
  },
  {
    id: "speed",
    label: "Speed",
    units: [
      { id: "ms", label: "m/s", factor: 1 },
      { id: "kmh", label: "km/h", factor: 1 / 3.6 },
      { id: "mph", label: "mph", factor: 0.44704 },
      { id: "kn", label: "Knot", factor: 0.514444 },
      { id: "fps", label: "ft/s", factor: 0.3048 },
      { id: "c", label: "Mach 1", factor: 340.3 },
    ],
  },
];

function fmt(v: number): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(6);
  return v.toLocaleString("en-US", { maximumSignificantDigits: 10 });
}

export function UnitConverter() {
  const [groupId, setGroupId] = useState("length");
  const group = GROUPS.find((g) => g.id === groupId)!;
  const [fromId, setFromId] = useState("m");
  const [toId, setToId] = useState("ft");
  const [value, setValue] = useState("1");

  const from = group.units.find((u) => u.id === fromId)!;
  const to = group.units.find((u) => u.id === toId)!;

  const result = useMemo(() => {
    const n = Number(value);
    if (!isFinite(n)) return null;
    if (group.special) return group.special(n, to.id);
    return (n * from.factor) / to.factor;
  }, [value, group, from, to]);

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  return (
    <ToolShell
      crumb="UNIT-CONVERTER"
      title="The translator."
      tagline="Kilometres to miles, bytes to petabytes, Celsius to Fahrenheit — every unit, instantly, in your tab."
    >
      <div className="mt-10 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setGroupId(g.id);
              setFromId(g.units[0].id);
              setToId(g.units[1].id);
            }}
            className={cn(
              "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
              groupId === g.id ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">From</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              spellCheck={false}
              className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-3 font-mono text-2xl font-bold text-ink outline-none focus:border-yellow"
            />
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="mt-2 w-full cursor-pointer rounded-md border-2 border-ink bg-surface px-2 py-2 font-mono text-sm font-semibold text-ink outline-none focus:border-yellow"
            >
              {group.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={swap}
            aria-label="Swap units"
            className="rounded-lg border-2 border-ink bg-yellow p-3 shadow-brutal-sm transition-transform duration-200 ease-brutal hover:translate-y-0.5 hover:shadow-none"
          >
            <Repeat className="h-5 w-5" aria-hidden="true" />
          </button>

          <label className="block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">To</span>
            <input
              readOnly
              value={result === null ? "?" : fmt(result)}
              className="mt-1 w-full rounded-md border-2 border-ink bg-ink px-3 py-3 font-mono text-2xl font-bold text-green outline-none"
            />
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="mt-2 w-full cursor-pointer rounded-md border-2 border-ink bg-surface px-2 py-2 font-mono text-sm font-semibold text-ink outline-none focus:border-yellow"
            >
              {group.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-md border-2 border-ink bg-yellow/30 px-3 py-2">
          <Ruler className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
            {fmt(Number(value) || 0)} {from.label} = {result === null ? "?" : fmt(result)} {to.label}
          </p>
        </div>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Exact factors, no rounding games — converted locally.
      </p>
    </ToolShell>
  );
}