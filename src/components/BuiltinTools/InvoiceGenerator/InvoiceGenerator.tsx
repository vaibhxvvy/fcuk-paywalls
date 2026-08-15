import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileDown, Maximize2, Plus, Receipt, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface LineItem {
  id: number;
  desc: string;
  qty: string;
  rate: string;
}

type TemplateId = "brutal" | "minimal" | "classic";

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "brutal", name: "Brutal", desc: "Black band, thick rules, mono numbers." },
  { id: "minimal", name: "Minimal", desc: "Light rules, whitespace, small caps." },
  { id: "classic", name: "Classic", desc: "Serif type, double rules, centered header." },
];

const A4_W = 595;
const A4_H = 842;

let nextId = 1;

const CURRENCIES = ["$", "€", "£", "₹", "¥"];

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

const CHAR_MAP: Record<string, string> = {
  "₹": "Rs.",
  "–": "-",
  "—": "-",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "×": "x",
  "·": ".",
  "•": "*",
  "\r": "",
  "\t": " ",
};

const sanitize = (s: string) =>
  s
    .split("")
    .map((c) => CHAR_MAP[c] ?? (c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 255 ? c : "?"))
    .join("");

export function InvoiceGenerator() {
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [number, setNumber] = useState("INV-001");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("$");
  const [taxPct, setTaxPct] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [template, setTemplate] = useState<TemplateId>("brutal");
  const [items, setItems] = useState<LineItem[]>([
    { id: nextId++, desc: "", qty: "1", rate: "" },
  ]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - 24;
      const h = el.clientHeight - 24;
      setScale(Math.min(1, Math.max(0.15, Math.min(w / A4_W, h / A4_H))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stepZoom = (d: number) =>
    setScale((s) => Math.min(1.5, Math.max(0.25, Math.round((s + d) * 100) / 100)));

  const clickFit = () => {
    const el = previewRef.current;
    if (el)
      setScale(Math.min(1, Math.max(0.15, Math.min((el.clientWidth - 24) / A4_W, (el.clientHeight - 24) / A4_H))));
  };

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

  const buildPdf = async (): Promise<Blob> => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const ink = rgb(0.07, 0.07, 0.07);
    const gray = rgb(0.42, 0.42, 0.42);
    const midGray = rgb(0.58, 0.58, 0.58);
    const paper = rgb(0.96, 0.94, 0.91);

    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvB = await doc.embedFont(StandardFonts.HelveticaBold);
    const mono = await doc.embedFont(StandardFonts.Courier);
    const monoB = await doc.embedFont(StandardFonts.CourierBold);
    const times = await doc.embedFont(StandardFonts.TimesRoman);
    const timesB = await doc.embedFont(StandardFonts.TimesRomanBold);
    const timesI = await doc.embedFont(StandardFonts.TimesRomanItalic);

    const M = 56;
    const W = 612 - M * 2;
    const pdfCur = currency === "₹" ? "Rs." : currency;
    const pm = (v: number) => `${pdfCur} ${v.toFixed(2)}`;

    const visible = items.filter((it) => it.desc.trim() || it.qty || it.rate).slice(0, 12);
    const sub = visible.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
    const disc = (sub * (parseFloat(discountPct) || 0)) / 100;
    const taxAmt = ((sub - disc) * (parseFloat(taxPct) || 0)) / 100;
    const tot = sub - disc + taxAmt;
    const num = sanitize(number.trim() || "INV-001");
    const sFrom = sanitize(fromName).trim() || "Your company";
    const sFromEmail = sanitize(fromEmail).trim();
    const sFromAddr = sanitize(fromAddress).split("\n").slice(0, 3);
    const sClient = sanitize(clientName).trim() || "Client";
    const sClientEmail = sanitize(clientEmail).trim();
    const sClientAddr = sanitize(clientAddress).split("\n").slice(0, 3);
    const sNotes = sanitize(notes).trim();

    const right = (text: string, size: number, f: typeof mono, x: number, y: number, color = ink) =>
      page.drawText(text, { x: x - f.widthOfTextAtSize(text, size), y, size, font: f, color });

    const fitRight = (
      text: string,
      size: number,
      f: typeof mono,
      rightX: number,
      y: number,
      maxW: number,
      color = ink,
    ) => {
      let s = size;
      let t = text;
      while (s > 6 && f.widthOfTextAtSize(t, s) > maxW) s -= 0.5;
      page.drawText(t, { x: rightX - f.widthOfTextAtSize(t, s), y, size: s, font: f, color });
    };

    if (template === "minimal") {
      page.drawText("INVOICE", { x: M, y: 736, size: 9, font: helv, color: midGray });
      right(num, 9, mono, 612 - M, 736, midGray);
      page.drawLine({ start: { x: M, y: 722 }, end: { x: M + W, y: 722 }, thickness: 0.5, color: midGray });

      page.drawText("FROM", { x: M, y: 696, size: 8, font: helvB, color: midGray });
      page.drawText(sFrom.toUpperCase(), { x: M, y: 682, size: 13, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: 668, size: 9, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: 654 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = 696 - sFromAddr.length * 12;
      page.drawText("BILL TO", { x: cx, y: cTop, size: 8, font: helvB, color: midGray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 11, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: gray });

      const headY = Math.min(616, dueY - 16);
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 8, font: helvB, color: midGray });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: helvB, color: midGray });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: helvB, color: midGray });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: helvB, color: midGray });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 0.5, color: gray });

      let rowY = headY - 26;
      for (const it of visible) {
        page.drawText(sanitize(it.desc), { x: M, y: rowY, size: 10, font: helv, color: ink, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, mono, M + W * 0.72, rowY, W * 0.12);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY, W * 0.18);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, M + W, rowY, W * 0.1);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.5, color: midGray });
        rowY -= 22;
      }
      page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 1, color: ink });

      const tx = M + W * 0.58;
      let ty = rowY - 36;
      page.drawText("SUBTOTAL", { x: tx, y: ty, size: 8, font: helvB, color: midGray });
      right(pm(sub), 9, mono, M + W, ty);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${sanitize(discountPct)}%)`, { x: tx, y: ty, size: 8, font: helvB, color: midGray });
        right(`-${pm(disc)}`, 9, mono, M + W, ty);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${sanitize(taxPct)}%)`, { x: tx, y: ty, size: 8, font: helvB, color: midGray });
        right(pm(taxAmt), 9, mono, M + W, ty);
      }
      ty -= 30;
      page.drawLine({ start: { x: tx, y: ty + 12 }, end: { x: M + W, y: ty + 12 }, thickness: 0.5, color: ink });
      page.drawText("TOTAL", { x: tx, y: ty, size: 12, font: helvB, color: ink });
      right(pm(tot), 11, monoB, M + W, ty);

      if (sNotes) {
        page.drawText("NOTES", { x: M, y: ty - 58, size: 8, font: helvB, color: midGray });
        page.drawText(sNotes, { x: M, y: ty - 70, size: 9, font: helv, color: ink, maxWidth: W * 0.9 });
      }
      page.drawText("generated locally by fcuk paywalls — no invoice service counted this one", {
        x: M,
        y: 40,
        size: 7,
        font: helv,
        color: midGray,
      });
    } else if (template === "classic") {
      page.drawLine({ start: { x: M, y: 752 }, end: { x: M + W, y: 752 }, thickness: 0.7, color: ink });
      page.drawLine({ start: { x: M, y: 746 }, end: { x: M + W, y: 746 }, thickness: 0.7, color: ink });

      const title = "INVOICE";
      page.drawText(title, {
        x: 306 - timesB.widthOfTextAtSize(title, 18) / 2,
        y: 716,
        size: 18,
        font: timesB,
        color: ink,
      });
      page.drawText(sFrom.toUpperCase(), {
        x: 306 - timesI.widthOfTextAtSize(sFrom.toUpperCase(), 10) / 2,
        y: 696,
        size: 10,
        font: timesI,
        color: ink,
      });
      if (sFromEmail)
        page.drawText(sFromEmail, {
          x: 306 - times.widthOfTextAtSize(sFromEmail, 8) / 2,
          y: 684,
          size: 8,
          font: times,
          color: gray,
        });

      const cx = M + W * 0.55;
      page.drawText("FROM", { x: M, y: 652, size: 9, font: timesB, color: ink });
      page.drawLine({ start: { x: M, y: 648 }, end: { x: M + W * 0.46, y: 648 }, thickness: 0.5, color: gray });
      page.drawText("BILL TO", { x: cx, y: 652, size: 9, font: timesB, color: ink });
      page.drawLine({ start: { x: cx, y: 648 }, end: { x: M + W, y: 648 }, thickness: 0.5, color: gray });
      page.drawText(sFrom, { x: M, y: 634, size: 10, font: times, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: 621, size: 8, font: times, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: 609 - i * 11, size: 8, font: times, color: gray }));
      page.drawText(sClient, { x: cx, y: 634, size: 10, font: times, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: 621, size: 8, font: times, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: 609 - i * 11, size: 8, font: times, color: gray }));
      const metaY = 598 - Math.max(sFromAddr.length, sClientAddr.length) * 11;
      page.drawText(`DATE  ${date}`, { x: M, y: metaY, size: 9, font: times, color: ink });
      page.drawText(`NUMBER  ${num}`, { x: cx, y: metaY, size: 9, font: times, color: ink });
      if (dueDate.trim())
        page.drawText(`DUE  ${sanitize(dueDate)}`, { x: M, y: metaY - 12, size: 9, font: times, color: ink });

      const headY = Math.min(564, metaY - 22);
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 9, font: timesB, color: ink });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 9, font: timesB, color: ink });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 9, font: timesB, color: ink });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 9, font: timesB, color: ink });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 0.7, color: ink });
      page.drawLine({ start: { x: M, y: headY - 11 }, end: { x: M + W, y: headY - 11 }, thickness: 0.7, color: ink });

      let rowY = headY - 32;
      for (const it of visible) {
        page.drawText(sanitize(it.desc), { x: M, y: rowY, size: 10, font: times, color: ink, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, times, M + W * 0.72, rowY, W * 0.12);
        fitRight(pm(parseFloat(it.rate) || 0), 10, times, M + W * 0.9, rowY, W * 0.18);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, timesB, M + W, rowY, W * 0.1);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.4, color: midGray });
        rowY -= 22;
      }
      page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 0.7, color: ink });

      const tx = M + W * 0.58;
      let ty = rowY - 38;
      page.drawText("SUBTOTAL", { x: tx, y: ty, size: 9, font: timesB, color: ink });
      right(pm(sub), 9, times, M + W, ty);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${sanitize(discountPct)}%)`, { x: tx, y: ty, size: 9, font: timesB, color: ink });
        right(`-${pm(disc)}`, 9, times, M + W, ty);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${sanitize(taxPct)}%)`, { x: tx, y: ty, size: 9, font: timesB, color: ink });
        right(pm(taxAmt), 9, times, M + W, ty);
      }
      ty -= 34;
      page.drawRectangle({
        x: tx - 8,
        y: ty - 12,
        width: W * 0.42 + 16,
        height: 34,
        borderColor: ink,
        borderWidth: 1,
      });
      page.drawText("TOTAL", { x: tx, y: ty, size: 12, font: timesB, color: ink });
      right(pm(tot), 12, timesB, M + W, ty);

      if (sNotes) {
        page.drawText("NOTES", { x: M, y: ty - 60, size: 8, font: timesB, color: ink });
        page.drawText(sNotes, { x: M, y: ty - 72, size: 9, font: timesI, color: ink, maxWidth: W * 0.9 });
      }
      page.drawText("generated locally by fcuk paywalls — no invoice service counted this one", {
        x: M,
        y: 40,
        size: 7,
        font: timesI,
        color: midGray,
      });
    } else {
      page.drawRectangle({ x: 0, y: 792 - 76, width: 612, height: 76, color: ink });
      page.drawText("INVOICE", { x: M, y: 792 - 50, size: 26, font: helvB, color: paper });
      page.drawText(num, { x: 612 - M - monoB.widthOfTextAtSize(num, 13), y: 792 - 46, size: 13, font: monoB, color: paper });

      let y = 792 - 76 - 30;
      page.drawText(sFrom.toUpperCase(), { x: M, y, size: 11, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: y - 15, size: 9, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: y - 27 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = y - sFromAddr.length * 12;
      page.drawText("TO", { x: cx, y: cTop, size: 9, font: helvB, color: gray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: gray });

      const headY = Math.min(y - 74, dueY - 20);
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 8, font: helvB, color: gray });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: helvB, color: gray });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: helvB, color: gray });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: helvB, color: gray });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 2, color: ink });

      let rowY = headY - 26;
      for (const it of visible) {
        page.drawText(sanitize(it.desc), { x: M, y: rowY, size: 10, font: helv, color: ink, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, mono, M + W * 0.72, rowY, W * 0.12);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY, W * 0.18);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, M + W, rowY, W * 0.1);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.5, color: gray });
        rowY -= 22;
      }
      page.drawLine({ start: { x: M, y: rowY - 4 }, end: { x: M + W, y: rowY - 4 }, thickness: 2, color: ink });

      const tx = M + W * 0.58;
      let ty = rowY - 36;
      page.drawText("SUBTOTAL", { x: tx, y: ty, size: 9, font: helvB, color: gray });
      right(pm(sub), 9, mono, M + W, ty);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${sanitize(discountPct)}%)`, { x: tx, y: ty, size: 9, font: helvB, color: gray });
        right(`-${pm(disc)}`, 9, mono, M + W, ty);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${sanitize(taxPct)}%)`, { x: tx, y: ty, size: 9, font: helvB, color: gray });
        right(pm(taxAmt), 9, mono, M + W, ty);
      }
      ty -= 30;
      page.drawRectangle({ x: tx, y: ty - 10, width: W * 0.42, height: 30, color: ink });
      page.drawText("TOTAL", { x: tx + 10, y: ty, size: 10, font: helvB, color: paper });
      right(pm(tot), 11, monoB, M + W, ty);

      if (sNotes) {
        page.drawText("NOTES", { x: M, y: ty - 58, size: 8, font: helvB, color: gray });
        page.drawText(sNotes, { x: M, y: ty - 70, size: 9, font: helv, color: ink, maxWidth: W * 0.9 });
      }
      page.drawText("generated locally by fcuk paywalls — no invoice service counted this one", {
        x: M,
        y: 40,
        size: 7,
        font: helv,
        color: gray,
      });
    }

    const bytes = await doc.save();
    return new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
  };

  const onExport = async () => {
    if (!hasContent) return;
    setStatus("working");
    setError(null);
    try {
      const blob = await buildPdf();
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

  const cols = "grid grid-cols-[minmax(0,1fr)_4rem_6rem_7rem] items-center gap-2";

  return (
    <ToolShell
      crumb="INVOICE-GENERATOR"
      title="The invoice."
      tagline="Line items, tax, discount, notes — a clean brutalist invoice PDF straight from your tab. Invoice Simple counts your 3 free ones; this one doesn't."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [01] Details
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Your company
                  </span>
                  <input className={inputCls} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Company name" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Email</span>
                  <input className={inputCls} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@company.com" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Address</span>
                  <textarea
                    className="mt-1 h-16 w-full resize-none rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder={"Street, city\nCountry, ZIP"}
                  />
                </label>
              </div>
              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Bill to
                  </span>
                  <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client company" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Client email</span>
                  <input className={inputCls} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@their-company.com" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Client address</span>
                  <textarea
                    className="mt-1 h-16 w-full resize-none rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder={"Street, city\nCountry, ZIP"}
                  />
                </label>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Invoice no.</span>
                <input className={inputCls} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="INV-001" />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Date</span>
                <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Due date</span>
                <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Line items
              <Plus className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className={`${cols} mt-4 border-b-2 border-ink/20 pb-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50`}>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="mt-2 space-y-2 overflow-x-auto">
              {items.map((it, i) => (
                <div key={it.id} className={cols}>
                  <input
                    className="min-w-0 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                    value={it.desc}
                    onChange={(e) => setItem(it.id, { desc: e.target.value })}
                    placeholder={`Item ${i + 1} — what they're paying for`}
                  />
                  <input
                    className="w-full rounded-md border-2 border-ink bg-surface-muted px-1.5 py-2 text-right font-mono text-xs text-ink outline-none focus:border-yellow"
                    value={it.qty}
                    onChange={(e) => setItem(it.id, { qty: e.target.value })}
                    placeholder="Qty"
                    title="Quantity"
                  />
                  <input
                    className="w-full rounded-md border-2 border-ink bg-surface-muted px-1.5 py-2 text-right font-mono text-xs text-ink outline-none focus:border-yellow"
                    value={it.rate}
                    onChange={(e) => setItem(it.id, { rate: e.target.value })}
                    placeholder="Rate"
                    title="Rate"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <span className="truncate font-mono text-xs font-bold text-ink/70">
                      {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      disabled={items.length === 1}
                      className="shrink-0 rounded-md border-2 border-ink p-1.5 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-red disabled:cursor-not-allowed disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
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
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [03] Preview
                <Eye className="h-4 w-4" aria-hidden="true" />
              </h2>
              <div className="ml-auto flex items-center gap-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    title={t.desc}
                    className={
                      t.id === template
                        ? "rounded-md border-2 border-ink bg-ink px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-paper"
                        : "rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
                    }
                  >
                    {t.name}
                  </button>
                ))}
                <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden="true" />
                <button
                  type="button"
                  onClick={clickFit}
                  title="Fit to screen"
                  className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => stepZoom(-0.1)}
                  title="Zoom out"
                  className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
                >
                  <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => stepZoom(0.1)}
                  title="Zoom in"
                  className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
                >
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              ref={previewRef}
              className="mt-4 h-[58dvh] min-h-[26rem] overflow-auto rounded-md border-2 border-ink bg-surface-muted"
            >
              <div className="flex min-h-full min-w-full p-3">
                <div
                  className="m-auto shrink-0 overflow-hidden rounded-sm shadow-brutal-md"
                  style={{
                    width: A4_W * scale,
                    height: A4_H * scale,
                    background: "#fff",
                  }}
                >
                  <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: A4_W, height: A4_H }}>
                    <PreviewPage
                      template={template}
                      fromName={fromName}
                      fromEmail={fromEmail}
                      fromAddress={fromAddress}
                      clientName={clientName}
                      clientEmail={clientEmail}
                      clientAddress={clientAddress}
                      number={number}
                      date={date}
                      dueDate={dueDate}
                      currency={currency}
                      taxPct={taxPct}
                      discountPct={discountPct}
                      notes={notes}
                      items={items}
                      subtotal={subtotal}
                      discount={discount}
                      tax={tax}
                      total={total}
                      money={money}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [04] Totals & export
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
                className="mt-1 h-20 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, thank-you, whatever — it goes on the PDF"
              />
            </label>

            <Button onClick={onExport} disabled={!hasContent || status === "working"} className="mt-4 w-full uppercase">
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
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Generated locally with pdf-lib — the invoice service with no 3-invoices-a-month meter.
      </p>
    </ToolShell>
  );
}

interface PreviewProps {
  template: TemplateId;
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  number: string;
  date: string;
  dueDate: string;
  currency: string;
  taxPct: string;
  discountPct: string;
  notes: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  money: (v: number) => string;
}

function PreviewPage(props: PreviewProps) {
  const {
    template,
    fromName,
    fromEmail,
    fromAddress,
    clientName,
    clientEmail,
    clientAddress,
    number,
    date,
    dueDate,
    taxPct,
    discountPct,
    notes,
    items,
    money,
  } = props;

  const visible = items.filter((it) => it.desc.trim() || it.qty || it.rate).slice(0, 12);
  const addrLines = (a: string) => a.split("\n").slice(0, 3).filter(Boolean);
  const sFrom = fromName.trim() || "Your company";
  const sClient = clientName.trim() || "Client";

  if (template === "minimal") {
    return (
      <div className="flex h-full w-full flex-col bg-white px-14 pb-10 pt-10 font-mono text-ink">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">Invoice</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
            {number.trim() || "INV-001"}
          </span>
        </div>
        <div className="mt-2 border-t border-ink/30" />
        <p className="mt-5 text-2xl font-bold uppercase leading-none">{sFrom}</p>
        {fromEmail.trim() && <p className="mt-1.5 text-[11px] text-ink/50">{fromEmail}</p>}
        {addrLines(fromAddress).map((l) => (
          <p key={l} className="text-[10px] leading-relaxed text-ink/50">{l}</p>
        ))}
        <div className="mt-6 flex justify-between gap-8">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/40">Bill to</p>
            <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
            {clientEmail.trim() && <p className="text-[10px] text-ink/50">{clientEmail}</p>}
            {addrLines(clientAddress).map((l) => (
              <p key={l} className="text-[10px] leading-relaxed text-ink/50">{l}</p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] leading-relaxed text-ink/60">DATE  {date}</p>
            {dueDate && <p className="text-[10px] leading-relaxed text-ink/60">DUE  {dueDate}</p>}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] gap-2 border-t border-ink/40 pt-2 text-[9px] font-bold uppercase tracking-widest text-ink/40">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="mt-1 flex-1">
          {visible.map((it, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] items-center gap-2 border-b border-ink/15 py-2 text-[11px]"
            >
              <span className="truncate">{it.desc}</span>
              <span className="truncate text-right">{it.qty}</span>
              <span className="truncate text-right">{money(parseFloat(it.rate) || 0)}</span>
              <span className="truncate text-right font-bold">
                {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-ink/50">
              <span>SUBTOTAL</span>
              <span>{money(props.subtotal)}</span>
            </div>
            {props.discount > 0 && (
              <div className="flex justify-between text-ink/50">
                <span>DISCOUNT ({discountPct}%)</span>
                <span>-{money(props.discount)}</span>
              </div>
            )}
            {props.tax > 0 && (
              <div className="flex justify-between text-ink/50">
                <span>TAX ({taxPct}%)</span>
                <span>{money(props.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/40 pt-2 font-bold">
              <span>TOTAL</span>
              <span>{money(props.total)}</span>
            </div>
          </div>
        </div>
        {notes.trim() && (
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/40">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        <p className="mt-auto pt-4 text-[8px] text-ink/30">
          generated locally by fcuk paywalls — no invoice service counted this one
        </p>
      </div>
    );
  }

  if (template === "classic") {
    return (
      <div className="flex h-full w-full flex-col bg-white px-14 pb-10 pt-10 font-serif text-ink">
        <div className="h-1 space-y-[3px]">
          <div className="h-px bg-ink" />
          <div className="h-px bg-ink" />
        </div>
        <p className="mt-8 text-center text-2xl font-bold">INVOICE</p>
        <p className="mt-1 text-center text-[11px] italic">{sFrom}</p>
        {fromEmail.trim() && <p className="text-center text-[9px] text-ink/50">{fromEmail}</p>}
        {addrLines(fromAddress).map((l) => (
          <p key={l} className="text-center text-[9px] leading-relaxed text-ink/50">{l}</p>
        ))}
        <div className="mt-7 flex justify-between gap-8">
          <div className="border-b border-ink/30 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest">From</p>
            <p className="mt-1 text-[11px] font-bold">{sFrom}</p>
            {fromEmail.trim() && <p className="text-[9px] text-ink/50">{fromEmail}</p>}
          </div>
          <div className="border-b border-ink/30 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest">Bill to</p>
            <p className="mt-1 text-[11px] font-bold">{sClient}</p>
            {clientEmail.trim() && <p className="text-[9px] text-ink/50">{clientEmail}</p>}
          </div>
        </div>
        <div className="mt-3 flex justify-between text-[10px]">
          <span>
            DATE&nbsp;&nbsp;{date}
            {dueDate && (
              <>
                <br />
                DUE&nbsp;&nbsp;{dueDate}
              </>
            )}
          </span>
          <span>NUMBER&nbsp;&nbsp;{number.trim() || "INV-001"}</span>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] gap-2 border-t-2 border-b-2 border-ink pt-2 pb-2 text-[9px] font-bold uppercase tracking-widest">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="mt-1 flex-1">
          {visible.map((it, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] items-center gap-2 border-b border-ink/15 py-2 text-[11px]"
            >
              <span className="truncate">{it.desc}</span>
              <span className="truncate text-right">{it.qty}</span>
              <span className="truncate text-right">{money(parseFloat(it.rate) || 0)}</span>
              <span className="truncate text-right font-bold">
                {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold">SUBTOTAL</span>
              <span>{money(props.subtotal)}</span>
            </div>
            {props.discount > 0 && (
              <div className="flex justify-between">
                <span className="font-bold">DISCOUNT ({discountPct}%)</span>
                <span>-{money(props.discount)}</span>
              </div>
            )}
            {props.tax > 0 && (
              <div className="flex justify-between">
                <span className="font-bold">TAX ({taxPct}%)</span>
                <span>{money(props.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-2 border-ink px-3 py-2 font-bold">
              <span>TOTAL</span>
              <span>{money(props.total)}</span>
            </div>
          </div>
        </div>
        {notes.trim() && (
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] italic leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        <p className="mt-auto pt-4 text-center text-[8px] italic text-ink/30">
          generated locally by fcuk paywalls — no invoice service counted this one
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white pb-10 font-mono text-ink">
      <div className="flex items-center justify-between bg-ink px-14 py-5 text-paper">
        <span className="font-display text-3xl font-bold uppercase tracking-tight">Invoice</span>
        <span className="text-sm font-bold">{number.trim() || "INV-001"}</span>
      </div>
      <div className="flex flex-1 flex-col px-14 pt-6">
        <div className="flex justify-between gap-8">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">From</p>
            <p className="mt-1 text-sm font-bold uppercase">{sFrom}</p>
            {fromEmail.trim() && <p className="text-[10px] text-ink/60">{fromEmail}</p>}
            {addrLines(fromAddress).map((l) => (
              <p key={l} className="text-[10px] leading-relaxed text-ink/60">{l}</p>
            ))}
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">To</p>
            <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
            {clientEmail.trim() && <p className="text-[10px] text-ink/60">{clientEmail}</p>}
            {addrLines(clientAddress).map((l) => (
              <p key={l} className="text-[10px] leading-relaxed text-ink/60">{l}</p>
            ))}
            <p className="mt-2 text-[10px] text-ink/60">DATE&nbsp;&nbsp;{date}</p>
            {dueDate && <p className="text-[10px] text-ink/60">DUE&nbsp;&nbsp;&nbsp;{dueDate}</p>}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] gap-2 border-y-2 border-ink py-2 text-[9px] font-bold uppercase tracking-widest text-ink/50">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div>
          {visible.map((it, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] items-center gap-2 border-b border-ink/20 py-2 text-[11px]"
            >
              <span className="truncate">{it.desc}</span>
              <span className="truncate text-right">{it.qty}</span>
              <span className="truncate text-right">{money(parseFloat(it.rate) || 0)}</span>
              <span className="truncate text-right font-bold">
                {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-ink/60">
              <span>SUBTOTAL</span>
              <span>{money(props.subtotal)}</span>
            </div>
            {props.discount > 0 && (
              <div className="flex justify-between text-ink/60">
                <span>DISCOUNT ({discountPct}%)</span>
                <span>-{money(props.discount)}</span>
              </div>
            )}
            {props.tax > 0 && (
              <div className="flex justify-between text-ink/60">
                <span>TAX ({taxPct}%)</span>
                <span>{money(props.tax)}</span>
              </div>
            )}
            <div className="flex justify-between bg-ink px-3 py-2 font-bold text-paper">
              <span>TOTAL</span>
              <span>{money(props.total)}</span>
            </div>
          </div>
        </div>
        {notes.trim() && (
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        <p className="mt-auto pt-4 text-[8px] text-ink/30">
          generated locally by fcuk paywalls — no invoice service counted this one
        </p>
      </div>
    </div>
  );
}
