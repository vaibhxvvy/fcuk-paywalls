import { useEffect, useRef, useState } from "react";
import { Volume2, Play, Square } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
}

export function TextToSpeech() {
  const [text, setText] = useState(
    "Free once, then a wall. That is the pattern we kill. This page reads your text aloud in your browser — no minutes, no credits, no signup.",
  );
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => "speechSynthesis" in window);
  const pollRef = useRef<number>(0);

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        const opts: VoiceOption[] = v.map((voice) => ({ name: voice.name, lang: voice.lang, voice }));
        opts.sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
        setVoices(opts);
      }
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    pollRef.current = window.setInterval(load, 2000);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.clearInterval(pollRef.current);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = () => {
    if (!supported || !text.trim()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const opt = voices[voiceIdx];
    if (opt?.voice) u.voice = opt.voice;
    u.lang = opt?.voice?.lang || "en-US";
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <ToolShell
      crumb="TEXT-TO-SPEECH"
      title="The announcer."
      tagline="Paste text, hear it read aloud in your browser — unlimited voice minutes, zero credits."
    >
      {!supported ? (
        <div className="mt-10 rounded-lg border-[3px] border-ink bg-surface p-6 shadow-brutal-md">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
            [ ERROR ] Your browser has no speech engine. Try Chrome or Edge.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [01] Script
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            </h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              spellCheck={false}
              className="mt-4 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
            <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/40">
              {text.trim().split(/\s+/).filter(Boolean).length} words ·{" "}
              {Math.max(1, Math.ceil(text.trim().split(/\s+/).filter(Boolean).length / 150 / rate))} min at {Math.round(rate * 150)} wpm
            </p>
          </section>

          <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Console</h2>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Voice</span>
              <select
                value={voiceIdx}
                onChange={(e) => setVoiceIdx(Number(e.target.value))}
                className="mt-1 w-full cursor-pointer rounded-md border-2 border-ink bg-surface px-2 py-2 font-mono text-sm font-semibold text-ink outline-none focus:border-yellow"
              >
                {voices.map((v, i) => (
                  <option key={i} value={i}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Speed — {rate.toFixed(1)}×
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="mt-2 w-full accent-yellow"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Pitch — {pitch.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="mt-2 w-full accent-yellow"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={speak} disabled={!text.trim() || speaking} className="flex-1 uppercase">
                <Play className="h-4 w-4" aria-hidden="true" /> Speak
              </Button>
              <Button variant="secondary" onClick={stop} disabled={!speaking} className="uppercase">
                <Square className="h-4 w-4" aria-hidden="true" /> Stop
              </Button>
            </div>

            <p className="mt-4 rounded-md border-2 border-dashed border-ink/40 bg-surface-muted p-3 font-mono text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-ink/60">
              Voices are your OS voices. The audio never leaves your machine — no metered minutes, no account.
            </p>
          </section>
        </div>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Uses your browser's built-in speech engine — the same tech, minus the credits system.
      </p>
    </ToolShell>
  );
}