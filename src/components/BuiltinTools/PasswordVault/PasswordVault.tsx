import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Copy, KeyRound, Lock, Plus, ShieldCheck, Trash2, Unlock } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const VAULT_KEY = "fcuk-vault-v1";

interface Entry {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  otp: string;
}

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

const b64 = {
  enc: (u: Uint8Array) => btoa(String.fromCharCode(...u)),
  dec: (s: string) => {
    const bin = atob(s);
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  },
};

const deriveKey = async (passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> => {
  const mat = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    mat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const encryptVault = async (key: CryptoKey, entries: Entry[], salt?: Uint8Array<ArrayBuffer>): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(entries));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const s = salt ?? crypto.getRandomValues(new Uint8Array(16));
  return JSON.stringify({ salt: b64.enc(s), iv: b64.enc(iv), data: b64.enc(new Uint8Array(ct)) });
};

const decryptVault = async (key: CryptoKey, payload: string): Promise<Entry[]> => {
  const p = JSON.parse(payload) as { iv: string; data: string };
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(p.iv) }, key, b64.dec(p.data));
  return JSON.parse(new TextDecoder().decode(pt)) as Entry[];
};

const base32Decode = (s: string): Uint8Array<ArrayBuffer> => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const buf = new Uint8Array(new ArrayBuffer(out.length));
  buf.set(out);
  return buf;
};

const hotp = async (secret: Uint8Array<ArrayBuffer>, counter: number): Promise<string> => {
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setUint32(0, Math.floor(counter / 2 ** 32), false);
  dv.setUint32(4, counter >>> 0, false);
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const off = sig[sig.length - 1] & 0x0f;
  const code = ((sig[off] & 0x7f) << 24) | (sig[off + 1] << 16) | (sig[off + 2] << 8) | sig[off + 3];
  return String(code % 1_000_000).padStart(6, "0");
};

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
};

function TotpCode({ secret }: { secret: string }) {
  const [code, setCode] = useState("");
  const [left, setLeft] = useState(30);

  useEffect(() => {
    const tick = async () => {
      const counter = Math.floor(Date.now() / 1000 / 30);
      setLeft(30 - Math.floor((Date.now() / 1000) % 30));
      try {
        setCode(await hotp(base32Decode(secret), counter));
      } catch {
        setCode("INVALID");
      }
    };
    void tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [secret]);

  return (
    <span className="flex items-center gap-2 font-mono text-sm font-bold tracking-widest text-ink">
      {code}
      <span className={`text-[10px] font-semibold ${left <= 5 ? "text-red" : "text-ink/40"}`}>{left}s</span>
      <button
        type="button"
        onClick={() => copy(code)}
        title="Copy code"
        className="rounded border-2 border-ink p-1 text-ink transition-colors duration-150 ease-brutal hover:bg-yellow/40"
      >
        <Copy className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function PasswordVault() {
  const [locked, setLocked] = useState(true);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [armed, setArmed] = useState(false);
  const armRef = useRef(0);

  const persist = async (list: Entry[]) => {
    if (!keyRef.current) return;
    const payload = await encryptVault(keyRef.current, list);
    localStorage.setItem(VAULT_KEY, payload);
    setEntries(list);
  };

  const unlock = async () => {
    if (!pass) {
      setError("A passphrase is the vault. Type one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (!raw) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveKey(pass, salt);
        keyRef.current = key;
        const payload = await encryptVault(key, [], salt);
        localStorage.setItem(VAULT_KEY, payload);
        setEntries([]);
        setLocked(false);
        setNotice("Fresh vault created and encrypted on this device. Export a backup before you clear cookies.");
      } else {
        const p = JSON.parse(raw) as { salt: string; iv: string; data: string };
        const key = await deriveKey(pass, b64.dec(p.salt));
        const list = await decryptVault(key, raw);
        keyRef.current = key;
        setEntries(list);
        setLocked(false);
      }
    } catch {
      setError("Wrong passphrase — the vault refused to open. There is no reset button, on purpose.");
    } finally {
      setBusy(false);
    }
  };

  const lock = () => {
    keyRef.current = null;
    setLocked(true);
    setPass("");
    setRevealed(null);
    setEditing(null);
    setNotice(null);
    setPwOpen(false);
    setOldPass("");
    setNewPass("");
    setNewPass2("");
    setArmed(false);
    window.clearTimeout(armRef.current);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const list = entries.some((x) => x.id === editing.id)
      ? entries.map((x) => (x.id === editing.id ? editing : x))
      : [...entries, editing];
    await persist(list);
    setEditing(null);
    setNotice("Saved — encrypted at rest with AES-GCM.");
  };

  const remove = async (id: string) => {
    await persist(entries.filter((x) => x.id !== id));
    setNotice("Entry deleted. The bytes are gone for good.");
  };

  const nuke = async () => {
    if (!armed) {
      setArmed(true);
      setNotice("NUKE ARMED — click again within 4s to wipe the vault entirely.");
      window.clearTimeout(armRef.current);
      armRef.current = window.setTimeout(() => {
        setArmed(false);
        setNotice(null);
      }, 4000);
      return;
    }
    window.clearTimeout(armRef.current);
    setArmed(false);
    localStorage.removeItem(VAULT_KEY);
    keyRef.current = null;
    setEntries([]);
    setEditing(null);
    setLocked(true);
    setPass("");
    setRevealed(null);
    setPwOpen(false);
    setOldPass("");
    setNewPass("");
    setNewPass2("");
    setError("Vault wiped — create a fresh one below with a new passphrase.");
  };

  const changePassword = async () => {
    if (!oldPass || !newPass) {
      setError("Fill in both the old and the new passphrase.");
      return;
    }
    if (newPass !== newPass2) {
      setError("The new passphrases don't match.");
      return;
    }
    if (newPass.length < 8) {
      setError("Make the new passphrase at least 8 characters.");
      return;
    }
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (!raw) throw new Error("no-vault");
      const p = JSON.parse(raw) as { salt: string };
      const oldKey = await deriveKey(oldPass, b64.dec(p.salt));
      const list = await decryptVault(oldKey, raw);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const newKey = await deriveKey(newPass, salt);
      localStorage.setItem(VAULT_KEY, await encryptVault(newKey, list, salt));
      keyRef.current = newKey;
      setPwOpen(false);
      setOldPass("");
      setNewPass("");
      setNewPass2("");
      setError(null);
      setNotice("Passphrase changed — the old one no longer opens the vault.");
    } catch {
      setError("Old passphrase is wrong — nothing was changed.");
    }
  };

  const setField = (k: keyof Entry) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editing) return;
    setEditing({ ...editing, [k]: e.target.value });
  };

  const exportBackup = async () => {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fcuk-vault-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setNotice("Backup exported — it's encrypted, but treat it like a key, not a receipt.");
  };

  const importBackup = (f: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = String(reader.result);
        if (!keyRef.current) return;
        const list = await decryptVault(keyRef.current, raw);
        await persist(list);
        setNotice(`Imported ${list.length} entries from backup.`);
      } catch {
        setError("Backup import failed — wrong passphrase or a corrupted file.");
      }
    };
    reader.readAsText(f);
  };

  if (locked) {
    return (
      <ToolShell
        crumb="PASSWORD-VAULT"
        title="The strongbox."
        tagline="A local, encrypted vault for passwords and 2FA codes. The password managers sync your secrets to their cloud and bill you for the privilege; this one keeps the keys on your machine."
      >
        <div className="mx-auto mt-12 max-w-md rounded-lg border-[3px] border-ink bg-surface p-6 shadow-brutal-md">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              {localStorage.getItem(VAULT_KEY) ? "Unlock vault" : "Create vault"}
            </h2>
          </div>
          <label className="mt-5 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Passphrase</span>
            <input
              type="password"
              className={inputCls}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void unlock();
              }}
              placeholder="A long one, not a word"
              autoFocus
            />
          </label>
          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
          <Button onClick={() => void unlock()} disabled={busy} className="mt-4 w-full uppercase">
            <Unlock className="h-4 w-4" aria-hidden="true" />
            {busy ? "Deriving key…" : localStorage.getItem(VAULT_KEY) ? "Unlock" : "Create vault"}
          </Button>
          <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            310k PBKDF2 rounds · AES-256-GCM · no reset, no recovery email — that's the point.
          </p>
        </div>
      </ToolShell>
    );
  }

  return (
    <ToolShell
      crumb="PASSWORD-VAULT"
      title="The strongbox."
      tagline="A local, encrypted vault for passwords and 2FA codes. The password managers sync your secrets to their cloud and bill you for the privilege; this one keeps the keys on your machine."
    >
      <div className="mt-10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Vault
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </h2>
          <span className="ml-auto rounded-md border-2 border-ink bg-surface-muted px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
            {entries.length} entries · encrypted locally
          </span>
        </div>

        {notice && (
          <p className="mt-4 rounded-md border-2 border-ink bg-yellow/40 px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink">
            [ ERROR ] {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditing({ id: newId(), name: "", username: "", password: "", url: "", notes: "", otp: "" })} className="uppercase">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add entry
          </Button>
          <Button variant="secondary" onClick={exportBackup} className="uppercase">
            Export backup
          </Button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => importRef.current?.click()} className="uppercase">
            Import backup
          </Button>
          <Button variant="secondary" onClick={() => setPwOpen((o) => !o)} className="uppercase">
            Change passphrase
          </Button>
          <Button
            variant="destructive"
            onClick={() => void nuke()}
            className="uppercase"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {armed ? "CONFIRM NUKE" : "Nuke vault"}
          </Button>
          <Button variant="ghost" onClick={lock} className="ml-auto uppercase">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Lock
          </Button>
        </div>

        {pwOpen && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void changePassword();
            }}
            className="mt-4 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md"
          >
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">Change passphrase</h3>
            <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
              Verifies the current passphrase, then re-encrypts every entry with a fresh key and salt.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Current passphrase</span>
                <input type="password" className={inputCls} value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">New passphrase</span>
                <input type="password" className={inputCls} value={newPass} onChange={(e) => setNewPass(e.target.value)} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Repeat new</span>
                <input type="password" className={inputCls} value={newPass2} onChange={(e) => setNewPass2(e.target.value)} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" className="uppercase">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Re-encrypt with new passphrase
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPwOpen(false)} className="uppercase">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {editing && (
          <form onSubmit={(e) => void save(e)} className="mt-4 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              {entries.some((x) => x.id === editing.id) ? "Edit entry" : "New entry"}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Name</span>
                <input className={inputCls} value={editing.name} onChange={setField("name")} placeholder="GitHub" required />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Username</span>
                <input className={inputCls} value={editing.username} onChange={setField("username")} placeholder="you@example.com" />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Password</span>
                <input className={inputCls} value={editing.password} onChange={setField("password")} placeholder="hunter2‑but‑longer" />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">URL</span>
                <input className={inputCls} value={editing.url} onChange={setField("url")} placeholder="github.com" />
              </label>
              <label className="col-span-2 block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  TOTP secret (base32 — for 2FA codes)
                </span>
                <input className={inputCls} value={editing.otp} onChange={setField("otp")} placeholder="JBSWY3DPEHPK3PXP" />
              </label>
              <label className="col-span-2 block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Notes</span>
                <textarea className={inputCls} rows={2} value={editing.notes} onChange={setField("notes")} />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" className="uppercase">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Save entry
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)} className="uppercase">
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {entries.length === 0 && (
            <div className="rounded-md border-2 border-dashed border-ink/30 p-8 text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                Vault is empty — add your first entry
              </p>
            </div>
          )}
          {entries.map((en) => (
            <div key={en.id} className="rounded-lg border-[3px] border-ink bg-surface p-4 shadow-brutal-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-bold text-ink">{en.name || "Untitled"}</p>
                  <p className="truncate font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                    {en.username || "no username"} {en.url ? `· ${en.url}` : ""}
                  </p>
                </div>
                {en.otp && <TotpCode secret={en.otp} />}
                <div className="flex items-center gap-1.5">
                  {en.username && (
                    <button
                      type="button"
                      onClick={() => copy(en.username)}
                      title="Copy username"
                      className="rounded border-2 border-ink p-1.5 text-ink transition-colors duration-150 ease-brutal hover:bg-yellow/40"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {en.password && (
                    <button
                      type="button"
                      onClick={() => {
                        if (revealed === en.id) copy(en.password);
                        else setRevealed(en.id);
                      }}
                      title={revealed === en.id ? "Copy password" : "Reveal password"}
                      className="rounded border-2 border-ink p-1.5 text-ink transition-colors duration-150 ease-brutal hover:bg-yellow/40"
                    >
                      {revealed === en.id ? (
                        <span className="font-mono text-[10px] font-bold">{en.password.length} chars</span>
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(en)}
                    className="rounded border-2 border-ink p-1.5 text-ink transition-colors duration-150 ease-brutal hover:bg-yellow/40"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(en.id)}
                    title="Delete"
                    className="rounded border-2 border-ink p-1.5 text-ink transition-colors duration-150 ease-brutal hover:bg-red/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {revealed === en.id && en.password && (
                <p className="mt-2 truncate rounded-md border-2 border-ink bg-surface-muted px-3 py-2 font-mono text-xs font-bold text-ink">
                  {en.password}
                </p>
              )}
              {en.notes && <p className="mt-2 font-mono text-[10px] font-semibold text-ink/50">{en.notes}</p>}
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
          Stored only in this browser's localStorage, AES-256-GCM encrypted. Export backups before clearing data — the vault has no recovery email, and that's the whole point.
        </p>
      </div>
    </ToolShell>
  );
}