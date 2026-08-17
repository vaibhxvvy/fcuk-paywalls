import { useRef, useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface LockedFile {
  name: string;
  size: number;
  pages: number;
  data: ArrayBuffer;
}

export function PdfLock() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<LockedFile | null>(null);
  const [userPass, setUserPass] = useState("");
  const [ownerPass, setOwnerPass] = useState("");
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowEdit, setAllowEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = async (f: File) => {
    setError(null);
    setDone(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await f.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true });
      setFile({ name: f.name, size: f.size, pages: src.getPageCount(), data: buf });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not read that PDF.";
      setError(/password|encrypted/i.test(msg) ? "ALREADY LOCKED — RUN IT THROUGH THE PDF UNLOCKER FIRST" : msg);
    }
  };

  const lock = async () => {
    if (!file) return;
    if (!userPass && !ownerPass) {
      setError("SET AT LEAST ONE PASSWORD — AN EMPTY LOCK OPENS FOR ANYONE");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
      const aes = typeof crypto !== "undefined" && !!crypto.subtle;
      const out = await encryptPDF(new Uint8Array(file.data), userPass || "", {
        ownerPassword: ownerPass || userPass,
        algorithm: aes ? "AES-256" : "RC4",
        allowPrinting: allowPrint,
        allowCopying: allowCopy,
        allowModifying: allowEdit,
        allowAnnotating: allowEdit,
        allowFillingForms: allowEdit,
      });
      const blob = new Blob([new Uint8Array(out).buffer as ArrayBuffer], { type: "application/pdf" });
      const a = document.createElement("a");
      a.download = file.name.replace(/\.pdf$/i, "") + "-locked.pdf";
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(`[ OK ] LOCKED — ${file.pages} PAGES, ${(blob.size / 1024).toFixed(0)} KB, ${aes ? "AES-256" : "RC4-128"}`);
    } catch (e) {
      setError(`LOCK FAILED — ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setUserPass("");
    setOwnerPass("");
    setAllowPrint(true);
    setAllowCopy(true);
    setAllowEdit(false);
    setError(null);
    setDone(null);
  };

  return (
    <ToolShell
      crumb="PDF-LOCKER"
      title="The vault."
      tagline="Password-protect any unlocked PDF in one click — open password, permissions password, print/copy/edit flags. The quota sites ration 2 protects a day; encryption is a spec, not a subscription."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] The file
            <Lock className="h-4 w-4" aria-hidden="true" />
          </h2>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LockOpen className="mx-auto h-6 w-6" aria-hidden="true" />
            <p className="mt-2 font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {file ? file.name : "Pick a PDF to lock"}
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />

          {file && (
            <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
              {file.pages} pages · {(file.size / 1024).toFixed(0)} KB · ready to lock
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] The locks</h2>

          {file ? (
            <>
              <label className="mt-4 block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  User password — needed to open the file
                </span>
                <input
                  type="password"
                  value={userPass}
                  onChange={(e) => setUserPass(e.target.value)}
                  placeholder="Lock the door"
                  className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                />
              </label>

              <label className="mt-4 block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Permissions password — needed to change the locks
                </span>
                <input
                  type="password"
                  value={ownerPass}
                  onChange={(e) => setOwnerPass(e.target.value)}
                  placeholder="Leave empty to reuse the user password"
                  className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                />
              </label>

              <div className="mt-4 space-y-2 rounded-md border-2 border-ink bg-surface-muted p-3">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Allow readers to…
                </p>
                <label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  <input
                    type="checkbox"
                    checked={allowPrint}
                    onChange={(e) => setAllowPrint(e.target.checked)}
                    className="h-4 w-4 accent-yellow"
                  />
                  Print
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  <input
                    type="checkbox"
                    checked={allowCopy}
                    onChange={(e) => setAllowCopy(e.target.checked)}
                    className="h-4 w-4 accent-yellow"
                  />
                  Copy text
                </label>
                <label className="flex cursor-pointer items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
                  <input
                    type="checkbox"
                    checked={allowEdit}
                    onChange={(e) => setAllowEdit(e.target.checked)}
                    className="h-4 w-4 accent-yellow"
                  />
                  Edit & fill forms
                </label>
              </div>

              <Button onClick={() => void lock()} disabled={busy} className="mt-4 w-full uppercase">
                <Lock className="h-4 w-4" aria-hidden="true" />
                {busy ? "Locking…" : "Lock it & download"}
              </Button>

              {done && (
                <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                  <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
                  {done}
                </p>
              )}

              <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                Permissions password only → the file opens for anyone but respects your flags. User password →
                nobody opens it without the key. Both are standard PDF encryption, keyed in your tab.
              </p>
            </>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Pick a PDF and the locks appear here — no account, no file upload
              </p>
            </div>
          )}

          {file && (
            <Button variant="ghost" size="sm" onClick={reset} className="mt-4 w-full uppercase">
              Start over with a different file
            </Button>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Forgot a password? The unlocker lives one click away in this same arsenal — locks cut both ways.
      </p>
    </ToolShell>
  );
}
