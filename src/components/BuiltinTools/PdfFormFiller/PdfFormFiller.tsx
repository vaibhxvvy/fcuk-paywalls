import { useRef, useState } from "react";
import { FileDown, FileInput, Upload } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

type FieldKind = "text" | "checkbox" | "radio" | "dropdown" | "optionlist" | "other";

interface FieldInfo {
  key: string;
  name: string;
  kind: FieldKind;
  options: string[];
}

type FieldValue = string | boolean | string[];

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

export function PdfFormFiller() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [flatten, setFlatten] = useState(false);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const srcRef = useRef<ArrayBuffer | null>(null);

  const classify = (
    f: unknown,
    classes: {
      PDFTextField: Function;
      PDFCheckBox: Function;
      PDFRadioGroup: Function;
      PDFDropdown: Function;
      PDFOptionList: Function;
    },
  ): { kind: FieldKind; options: string[] } => {
    const { PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } = classes;
    const options = (f as { getOptions?: () => string[] }).getOptions?.() ?? [];
    if (f instanceof PDFTextField) return { kind: "text", options };
    if (f instanceof PDFCheckBox) return { kind: "checkbox", options };
    if (f instanceof PDFRadioGroup) return { kind: "radio", options };
    if (f instanceof PDFDropdown) return { kind: "dropdown", options };
    if (f instanceof PDFOptionList) return { kind: "optionlist", options };
    return { kind: "other", options };
  };

  const onFile = async (f: File) => {
    setFile(f);
    setError(null);
    setFields([]);
    setValues({});
    setStatus("working");
    try {
      const { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList } =
        await import("pdf-lib");
      const buf = await f.arrayBuffer();
      const doc = await PDFDocument.load(buf);
      srcRef.current = buf;
      const form = doc.getForm();
      const all = form.getFields();
      const infos: FieldInfo[] = [];
      const vals: Record<string, FieldValue> = {};
      for (let i = 0; i < all.length; i++) {
        const fi = all[i] as { getName?: () => string } & {
          getText?: () => string;
          isChecked?: () => boolean;
          getSelected?: () => string | string[];
        };
        const { kind, options } = classify(all[i], {
          PDFTextField,
          PDFCheckBox,
          PDFRadioGroup,
          PDFDropdown,
          PDFOptionList,
        });
        if (kind === "other") continue;
        const key = `${i}:${fi.getName?.() ?? "field"}`;
        const name = fi.getName?.() ?? `field ${i + 1}`;
        infos.push({ key, name, kind, options });
        if (kind === "checkbox") vals[key] = fi.isChecked?.() ?? false;
        else if (kind === "text") vals[key] = fi.getText?.() ?? "";
        else if (kind === "radio") vals[key] = (fi.getSelected?.() as string) ?? "";
        else if (kind === "dropdown") vals[key] = (fi.getSelected?.() as string) ?? "";
        else if (kind === "optionlist") vals[key] = (fi.getSelected?.() as string[]) ?? [];
      }
      if (infos.length === 0) {
        setError("No fillable form fields found in this PDF.");
        setStatus("error");
        return;
      }
      setFields(infos);
      setValues(vals);
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that PDF.");
      setStatus("error");
    }
  };

  const setVal = (key: string, v: FieldValue) => setValues((m) => ({ ...m, [key]: v }));

  const onExport = async () => {
    setStatus("working");
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(srcRef.current!);
      const form = doc.getForm();
      const all = form.getFields();
      for (const fi of fields) {
        const idx = Number(fi.key.split(":")[0]);
        const f = all[idx] as {
          setText?: (t: string) => void;
          check?: () => void;
          uncheck?: () => void;
          select?: (o: string | string[]) => void;
        };
        const v = values[fi.key];
        try {
          if (fi.kind === "text") f.setText?.(typeof v === "string" ? v : "");
          else if (fi.kind === "checkbox") {
            if (v) f.check?.();
            else f.uncheck?.();
          } else if (fi.kind === "radio" || fi.kind === "dropdown") {
            if (typeof v === "string" && v) f.select?.(v);
          } else if (fi.kind === "optionlist") {
            f.select?.((Array.isArray(v) ? v : []).filter(Boolean));
          }
        } catch {
          // read-only or exotic widget — skip silently
        }
      }
      if (flatten) form.flatten();
      const bytes = await doc.save();
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(file?.name ?? "form").replace(/\.pdf$/i, "")}-filled.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fill that form.");
      setStatus("error");
    }
  };

  const filledCount = fields.filter((f) => {
    const v = values[f.key];
    if (f.kind === "checkbox") return v === true;
    if (f.kind === "optionlist") return Array.isArray(v) && v.length > 0;
    return typeof v === "string" && v.trim().length > 0;
  }).length;

  return (
    <ToolShell
      crumb="PDF-FORM-FILLER"
      title="The pen."
      tagline="See every fillable field in a PDF, type your answers, download the filled copy. PDFescape wants Pro to save; this saves locally."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Upload className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-10 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {file ? "Pick another PDF" : "Drop or pick a PDF"}
            </p>
            <p className="mt-1 font-mono text-[10px] font-semibold text-ink/40">
              Interactive forms only — plain scanned pages have no fields to fill
            </p>
          </button>

          {file && (
            <p className="mt-4 truncate rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
              {file.name}
            </p>
          )}

          {fields.length > 0 && (
            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => setFlatten(e.target.checked)}
                className="h-4 w-4 accent-ink"
              />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                Flatten — burn values in, lock the fields
              </span>
            </label>
          )}

          {status === "error" && (
            <p className="mt-5 rounded-md border-2 border-ink bg-red/20 px-3 py-4 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Fields
            <FileInput className="h-4 w-4" aria-hidden="true" />
          </h2>

          {fields.length > 0 ? (
            <>
              <div className="mt-4 max-h-[30rem] flex-1 space-y-4 overflow-auto rounded-md border-2 border-ink bg-surface-muted p-4">
                {fields.map((f) => {
                  const v = values[f.key];
                  return (
                    <div key={f.key}>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
                        {f.name} · {f.kind}
                      </p>
                      {f.kind === "text" && (
                        <input
                          className={inputCls}
                          value={typeof v === "string" ? v : ""}
                          onChange={(e) => setVal(f.key, e.target.value)}
                          placeholder="Answer…"
                        />
                      )}
                      {f.kind === "checkbox" && (
                        <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border-2 border-ink bg-surface px-3 py-2">
                          <input
                            type="checkbox"
                            checked={v === true}
                            onChange={(e) => setVal(f.key, e.target.checked)}
                            className="h-4 w-4 accent-ink"
                          />
                          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
                            Checked
                          </span>
                        </label>
                      )}
                      {(f.kind === "radio" || f.kind === "dropdown") && (
                        <select
                          className={inputCls}
                          value={typeof v === "string" ? v : ""}
                          onChange={(e) => setVal(f.key, e.target.value)}
                        >
                          <option value="">— none —</option>
                          {f.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      )}
                      {f.kind === "optionlist" && (
                        <div className="mt-1 space-y-1 rounded-md border-2 border-ink bg-surface p-2">
                          {f.options.map((o) => {
                            const arr = Array.isArray(v) ? v : [];
                            const on = arr.includes(o);
                            return (
                              <label key={o} className="flex cursor-pointer items-center gap-2 px-1 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={(e) =>
                                    setVal(
                                      f.key,
                                      e.target.checked ? [...arr, o] : arr.filter((x) => x !== o),
                                    )
                                  }
                                  className="h-3.5 w-3.5 accent-ink"
                                />
                                <span className="font-mono text-[11px] font-bold text-ink/70">{o}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button onClick={onExport} disabled={status === "working"} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  {status === "working" ? "Filling…" : "Download filled PDF"}
                </Button>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  {filledCount} / {fields.length} filled
                </span>
                {status === "done" && (
                  <span className="rounded-md border-2 border-ink bg-green/20 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                    Filled copy downloaded
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Form fields appear here
                <br />
                <span className="text-[10px] font-semibold">
                  Text fields, checkboxes, radios, dropdowns — all fillable, locally.
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Read and written with pdf-lib — the form filler with no Pro upsell.
      </p>
    </ToolShell>
  );
}