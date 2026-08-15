import { useMemo, useState } from "react";
import { FileDown, Plus, Receipt, Trash2 } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface LineItem {
  id: number;
  desc: string;
  qty: string;
  rate: string;
}

let nextId = 1;

const CURRENCIES = ["$", "€", "£", "₹", "¥"];

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

export function InvoiceGenerator() {
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [number, setNumber] = useState("INV-001");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState("$");
  const [taxPct, setTaxPct] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: nextId++, desc: "", qty: "1", rate: "" },
  ]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0),
    [items],
  );
  const discount = (subtotal * (parseFloat(discountPct) || 0)) / 100;
  const taxable = subtotal - discount;
  const tax = (taxable * (parseFloat(taxPct) || 0)) / 100;
  const total = taxable + tax;
  const money = (v: number) => `${currency} ${v.toFixed(2)}`;

  const setItem = (id: number, patch: Partial<LineItem>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeItem = (id: number) => setItems((rows) => rows.filter((r) => r.id !== id));

  const addItem = () => setItems((rows) => [...rows, { id: nextId++, desc: "", qty: "1", rate: "" }]);

  const hasContent = items.some((it) => it.desc.trim() && (it.qty || it.rate));

  const generate = async () => {
    if (!hasContent) return;
    setStatus("working");
    setError(null);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const page = doc.addPage([612, 792]);
      const ink = rgb(0.07, 0.07, 0.07);
      const paper = rgb(0.96, 0.94, 0.91);
      const gray = rgb(0.42, 0.42, 0.42);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      const mono = await doc.embedFont(StandardFonts.Courier);
      const monoBold = await doc.embedFont(StandardFonts.CourierBold);

      const M = 56;
      const W = 612 - M * 2;

      const visible = items.filter((it) => it.desc.trim() || it.qty || it.rate).slice(0, 12);
      const sub = visible.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
      const disc = (sub * (parseFloat(discountPct) || 0)) / 100;
      const taxAmt = ((sub - disc) * (parseFloat(taxPct) || 0)) / 100;
      const tot = sub - disc + taxAmt;

      const right = (text: string, size: number, f: typeof mono, x: number, y: number) =>
        page.drawText(text, { x: x - f.widthOfTextAtSize(text, size), y, size, font: f });

      page.drawRectangle({ x: 0, y: 792 - 76, width: 612, height: 76, color: ink });
      page.drawText("INVOICE", { x: M, y: 792 - 50, size: 26, font: bold, color: paper });
      const num = number.trim() || "INV-001";
      page.drawText(num, { x: 612 - M - monoBold.widthOfTextAtSize(num, 13), y: 792 - 46, size: 13, font: monoBold, color: paper });

      let y = 792 - 76 - 30;
      page.drawText((fromName.trim() || "Your company").toUpperCase(), { x: M, y, size: 11, font: bold, color: ink });
      if (fromEmail.trim()) page.drawText(fromEmail, { x: M, y: y - 15, size: 9, font, color: gray });

      const cx = M + W * 0.55;
      page.drawText("TO", { x: cx, y, size: 9, font: bold, color: gray });
      page.drawText((clientName.trim() || "Client").toUpperCase(), { x: cx, y: y - 14, size: 10, font: bold, color: ink });
      if (clientEmail.trim()) page.drawText(clientEmail, { x: cx, y: y - 26, size: 9, font, color: gray });
      page.drawText(`DATE  ${date}`, { x: cx, y: y - 38, size: 9, font: mono, color: gray });

      const headY = y - 74;
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 8, font: bold, color: gray });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: bold, color: gray });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: bold, color: gray });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: bold, color: gray });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 2, color: ink });

      let rowY = headY - 26;
      for (const it of visible) {
        page.drawText(it.desc, { x: M, y: rowY, size: 10, font, color: ink, maxWidth: W * 0.56 });
        right(it.qty, 10, mono, M + W * 0.72, rowY);
        right(money(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY);
        right(money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoBold, M + W, rowY);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.5, color: gray });
        rowY -= 22;
      }
      page.drawLine({ start: { x: M, y: rowY - 4 }, end: { x: M + W, y: rowY - 4 }, thickness: 2, color: ink });

      const tx = M + W * 0.58;
      let ty = rowY - 36;
      page.drawText("SUBTOTAL", { x: tx, y: ty, size: 9, font: bold, color: gray });
      right(money(sub), 9, mono, M + W, ty);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${discountPct}%)`, { x: tx, y: ty, size: 9, font: bold, color: gray });
        right(`-${money(disc)}`, 9, mono, M + W, ty);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${taxPct}%)`, { x: tx, y: ty, size: 9, font: bold, color: gray });
        right(money(taxAmt), 9, mono, M + W, ty);
      }
      ty -= 30;
      page.drawRectangle({ x: tx, y: ty - 10, width: W * 0.42, height: 30, color: ink });
      page.drawText("TOTAL", { x: tx + 10, y: ty, size: 10, font: bold, color: paper });
      right(money(tot), 11, monoBold, M + W, ty);

      if (notes.trim()) {
        page.drawText("NOTES", { x: M, y: ty - 58, size: 8, font: bold, color: gray });
        page.drawText(notes, { x: M, y: ty - 70, size: 9, font, color: ink, maxWidth: W * 0.9 });
      }
      page.drawText("generated locally by fcuk paywalls — no invoice service counted this one", {
        x: M,
        y: 40,
        size: 7,
        font,
        color: gray,
      });

      const bytes = await doc.save();
      const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${(number.trim() || "INV-001").toLowerCase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the invoice.");
      setStatus("error");
    }
  };

  return (
    <ToolShell
      crumb="INVOICE-GENERATOR"
      title="The invoice."
      tagline="Line items, tax, discount, notes — a clean brutalist invoice PDF straight from your tab. Invoice Simple counts your 3 free ones; this one doesn't."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Details
            <Receipt className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">From</span>
              <input className={inputCls} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your company" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Your email</span>
              <input className={inputCls} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@company.com" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Bill to</span>
              <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Client email</span>
              <input className={inputCls} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@their-company.com" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Invoice no.</span>
              <input className={inputCls} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="INV-001" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Date</span>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          <h3 className="mt-5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
            Line items
          </h3>
          <div className="mt-2 space-y-2">
            {items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2">
                <span className="w-5 shrink-0 font-mono text-[10px] font-bold text-ink/40">{i + 1}</span>
                <input
                  className="min-w-0 flex-1 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                  value={it.desc}
                  onChange={(e) => setItem(it.id, { desc: e.target.value })}
                  placeholder="What they're paying for"
                />
                <input
                  className="w-16 rounded-md border-2 border-ink bg-surface-muted px-2 py-2 text-center font-mono text-xs text-ink outline-none focus:border-yellow"
                  value={it.qty}
                  onChange={(e) => setItem(it.id, { qty: e.target.value })}
                  placeholder="Qty"
                  title="Quantity"
                />
                <input
                  className="w-24 rounded-md border-2 border-ink bg-surface-muted px-2 py-2 text-right font-mono text-xs text-ink outline-none focus:border-yellow"
                  value={it.rate}
                  onChange={(e) => setItem(it.id, { rate: e.target.value })}
                  placeholder="Rate"
                  title="Rate"
                />
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  disabled={items.length === 1}
                  className="rounded-md border-2 border-ink p-1.5 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-red disabled:cursor-not-allowed disabled:opacity-30"
                  title="Remove row"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-1.5 rounded-md border-2 border-dashed border-ink/60 bg-transparent px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-[background-color,border-color] duration-200 ease-brutal hover:border-ink hover:bg-surface-muted"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Add item
          </button>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Totals & export
            <FileDown className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Currency</span>
              <select
                className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-2 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Tax %</span>
              <input className={inputCls} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} placeholder="0" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Discount %</span>
              <input className={inputCls} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="0" />
            </label>
            <div className="rounded-md border-2 border-ink bg-ink p-2.5 text-center">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-paper/50">Total</p>
              <p className="mt-0.5 truncate font-mono text-sm font-bold text-yellow">{money(total)}</p>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Notes</span>
            <textarea
              className="mt-1 h-24 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, thank-you, whatever — it goes on the PDF"
            />
          </label>

          <div className="mt-4 rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
            {items.length} row{items.length === 1 ? "" : "s"} · subtotal {money(subtotal)}
            {discount > 0 ? ` · −${money(discount)}` : ""}
            {tax > 0 ? ` · ${money(tax)} tax` : ""}
          </div>

          <Button onClick={generate} disabled={!hasContent || status === "working"} className="mt-4 w-full uppercase">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {status === "working" ? "Writing PDF…" : "Generate invoice PDF"}
          </Button>
          {status === "done" && (
            <p className="mt-3 rounded-md border-2 border-ink bg-green/20 px-3 py-2.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              In your downloads — no trial trap, no watermark.
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Generated locally with pdf-lib — the invoice service with no 3-invoices-a-month meter.
      </p>
    </ToolShell>
  );
}
