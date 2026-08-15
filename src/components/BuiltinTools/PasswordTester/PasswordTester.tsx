import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { cn } from "../../../utils/cn";

const COMMON = new Set([
  "123456", "password", "12345678", "qwerty", "123456789", "12345", "1234", "111111",
  "1234567", "dragon", "123123", "baseball", "abc123", "football", "monkey", "letmein",
  "696969", "shadow", "master", "666666", "qwertyuiop", "123321", "mustang", "1234567890",
  "michael", "654321", "pussy", "superman", "1qaz2wsx", "7777777", "fuckyou", "121212",
  "000000", "qazwsx", "123qwe", "killer", "trustno1", "jordan", "jennifer", "zxcvbnm",
  "asdfgh", "hunter", "buster", "soccer", "harley", "batman", "andrew", "tigger",
  "sunshine", "iloveyou", "fuckme", "2000", "charlie", "robert", "thomas", "hockey",
  "ranger", "daniel", "starwars", "klaster", "112233", "george", "asshole", "computer",
  "michelle", "jessica", "pepper", "1111", "zxcvbn", "555555", "11111111", "131313",
  "freedom", "777777", "pass", "fuck", "maggie", "159753", "aaaaaa", "ginger", "princess",
  "joshua", "cheese", "amanda", "summer", "love", "ashley", "6969", "nicole", "chelsea",
  "biteme", "matthew", "access", "yankees", "987654321", "dallas", "austin", "thunder",
  "taylor", "matrix", "william", "corvette", "hello", "martin", "heather", "secret",
  "fucker", "merlin", "diamond", "1234qwer", "gfhjkm", "hammer", "silver", "222222",
  "88888888", "anthony", "justin", "test", "bailey", "q1w2e3r4t5", "patrick", "internet",
  "scooter", "orange", "11111", "golfer", "cookie", "richard", "samantha", "bigdog",
  "guitar", "jackson", "whatever", "mickey", "chicken", "sparky", "snoopy", "maverick",
  "phoenix", "camaro", "sexy", "peanut", "morgan", "welcome", "falcon", "cowboy",
  "ferrari", "samsung", "andrea", "smokey", "steelers", "joseph", "mercedes", "dakota",
  "arsenal", "eagles", "melissa", "boomer", "booboo", "spider", "nascar", "monster",
  "tigers", "yellow", "xxxxxx", "123123123", "gateway", "marina", "diablo", "bulldog",
  "qwer1234", "compaq", "purple", "hardcore", "banana", "junior", "hannah", "123654",
  "porsche", "lakers", "iceman", "money", "cowboys", "987654", "london", "tennis",
  "999999", "ncc1701", "coffee", "scooby", "0000", "miller", "boston", "q1w2e3r4",
  "brandon", "yamaha", "chester", "mother", "forever", "johnny", "edward", "333333",
  "oliver", "redsox", "player", "nikita", "knight", "fender", "barney", "midnight",
  "please", "brandy", "chicago", "badboy", "iwantu", "slayer", "rangers", "charles",
  "angel", "flower", "bigdaddy", "rabbit", "wizard", "bigdick", "jasper", "enter",
  "rachel", "chris", "steven", "winner", "adidas", "victoria", "natasha", "1q2w3e4r",
  "jasmine", "winter", "prince", "panties", "marine", "ghbdtn", "fishing", "cocacola",
  "casper", "james", "232323", "raiders", "888888", "marlboro", "gandalf", "asdfasdf",
  "crystal", "87654321", "12344321", "sexsex", "golden", "blowme", "bigtits", "8675309",
  "panther", "lauren", "angela", "bitch", "spanky", "thx1138", "angels", "madison",
  "winston", "shannon", "mike", "toyota", "blowjob", "jordan23", "canada", "sophie",
  "apples", "dick", "tiger", "razz", "123abc", "pokemon", "qazxsw", "55555", "qwaszx",
  "muffin", "johnson", "murphy", "cooper", "alexis", "123321123", "q123456", "sarah",
  "zxcvbnm", "hello123", "bob", "matt", "george", "david", "fuckyou2", "password1",
  "fuckyou1", "qwerty123", "1q2w3e", "123456a", "a123456", "q1w2e3", "password123",
  "1password", "iloveyou1", "admin123", "root", "toor", "administrator", "letmein1",
  "welcome1", "test123", "passw0rd", "password!", "password1234",
]);

function entropy(s: string): number {
  let pool = 0;
  if (/[a-z]/.test(s)) pool += 26;
  if (/[A-Z]/.test(s)) pool += 26;
  if (/[0-9]/.test(s)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(s)) pool += 33;
  if (pool === 0) return 0;
  const unique = new Set(s).size;
  if (unique < 3) return 0;
  return s.length * Math.log2(pool);
}

function crackTime(bits: number): string {
  const guessesPerSec = 1e10;
  const secs = 2 ** bits / guessesPerSec / 2;
  if (secs < 1) return "instantly";
  if (secs < 60) return `${Math.round(secs)} seconds`;
  if (secs < 3600) return `${Math.round(secs / 60)} minutes`;
  if (secs < 86400) return `${Math.round(secs / 3600)} hours`;
  if (secs < 86400 * 365) return `${Math.round(secs / 86400)} days`;
  const years = secs / (86400 * 365);
  if (years < 1000) return `${Math.round(years)} years`;
  if (years < 1e6) return `${Math.round(years / 1000)} thousand years`;
  if (years < 1e9) return `${Math.round(years / 1e6)} million years`;
  return "heat death of the universe";
}

export function PasswordTester() {
  const [password, setPassword] = useState("");

  const report = useMemo(() => {
    const bits = entropy(password);
    const lower = /[a-z]/.test(password);
    const upper = /[A-Z]/.test(password);
    const digits = /[0-9]/.test(password);
    const symbols = /[^a-zA-Z0-9]/.test(password);
    const classes = [lower, upper, digits, symbols].filter(Boolean).length;
    const sequential = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password);
    const repeated = /(.)\1{2,}/.test(password);
    const inCommon = COMMON.has(password.toLowerCase()) || password.length <= 4;

    let verdict: { label: string; color: string; bar: string };
    if (!password) verdict = { label: "Empty", color: "bg-ink/20", bar: "bg-ink/20" };
    else if (inCommon) verdict = { label: "Tragic", color: "bg-red text-ink", bar: "bg-red" };
    else if (bits < 28) verdict = { label: "Weak", color: "bg-red text-ink", bar: "bg-red" };
    else if (bits < 45) verdict = { label: "Okay", color: "bg-yellow text-ink", bar: "bg-yellow" };
    else if (bits < 70) verdict = { label: "Solid", color: "bg-blue text-ink", bar: "bg-blue" };
    else verdict = { label: "Unbreakable", color: "bg-green text-ink", bar: "bg-green" };

    const score = Math.min(100, Math.round((bits / 100) * 100));

    const tips: string[] = [];
    if (password.length < 12) tips.push(`Length ${password.length} — go 12+ characters`);
    if (!lower) tips.push("Add lowercase letters");
    if (!upper) tips.push("Add uppercase letters");
    if (!digits) tips.push("Add digits");
    if (!symbols) tips.push("Add symbols (!@#…)");
    if (sequential) tips.push("Drop the sequential run (abc, 123…)");
    if (repeated) tips.push("No repeating characters (aaa, 111…)");
    if (inCommon) tips.push("That password is on every hacker's list");
    if (classes < 3 && password.length >= 8) tips.push("Mix at least 3 character types");
    if (password.length >= 8 && classes >= 3 && !sequential && !repeated && !inCommon && bits >= 45) {
      tips.push("Strong. Make it unique per site and call it done.");
    }

    return { bits, classes, verdict, score, time: crackTime(bits), tips };
  }, [password]);

  return (
    <ToolShell
      crumb="PASSWORD-TESTER"
      title="The interrogator."
      tagline="Type a password, get an honest verdict. Entropy, crack time, and the fix list — no signup, no sending."
    >
      <div className="mt-10 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          [01] The suspect
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        </h2>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="Type a password to interrogate…"
          className="mt-4 w-full rounded-md border-2 border-ink bg-surface-muted px-3 py-3 font-mono text-lg font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
        />
        <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
          Never sent anywhere — analyzed only inside this tab
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Verdict</h2>
          <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4 text-center">
            <span
              className={cn(
                "inline-block rounded-md border-2 border-ink px-4 py-2 font-display text-2xl font-bold text-ink shadow-brutal-sm",
                report.verdict.color,
              )}
            >
              {report.verdict.label}
            </span>
          </div>
          <div className="mt-4 h-5 overflow-hidden rounded-md border-2 border-ink bg-surface-muted">
            <div
              className={cn("h-full transition-[width,background-color] duration-300 ease-brutal", report.verdict.bar)}
              style={{ width: `${Math.max(4, report.score)}%` }}
            />
          </div>
          <ul className="mt-4 space-y-2">
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Length</p>
              <p className="font-mono text-xs font-bold text-ink">{password.length} chars</p>
            </li>
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Character classes</p>
              <p className="font-mono text-xs font-bold text-ink">{report.classes} / 4</p>
            </li>
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Entropy</p>
              <p className="font-mono text-xs font-bold text-ink">{report.bits.toFixed(1)} bits</p>
            </li>
            <li className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Offline crack time</p>
              <p className="text-right font-mono text-xs font-bold text-ink">{report.time}</p>
            </li>
          </ul>
        </section>

        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[03] The fix list</h2>
          <ul className="mt-4 space-y-2">
            {report.tips.length === 0 ? (
              <li className="rounded-md border-2 border-ink bg-surface-muted px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink/40">
                Type something to start
              </li>
            ) : (
              report.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5">
                  <span className="mt-0.5 font-mono text-xs font-bold text-yellow">✕</span>
                  <p className="font-mono text-xs font-semibold leading-relaxed text-ink">{tip}</p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Crack time assumes 10 billion guesses/sec — the rate a serious rig throws at an offline hash.
      </p>
    </ToolShell>
  );
}