import { useEffect, useRef, useState } from "react";
import { FileDown, MonitorPlay, Pause, Play, Square } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const DAILY_KEY = "fcuk-loom-daily-count";
const DAILY_LIMIT = 25;
const MAX_SECONDS = 15 * 60;

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export function ScreenRecorder() {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mic, setMic] = useState(true);
  const [tabAudio, setTabAudio] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  const remaining = () => {
    const stored = localStorage.getItem(DAILY_KEY);
    const day = stored ? stored.split("|")[0] : "";
    const count = stored ? Number(stored.split("|")[1] ?? 0) : 0;
    const today = new Date().toDateString();
    return day === today ? Math.max(0, DAILY_LIMIT - count) : DAILY_LIMIT;
  };

  const setRecordedToday = () => {
    const day = new Date().toDateString();
    const stored = localStorage.getItem(DAILY_KEY);
    const count = stored && stored.split("|")[0] === day ? Number(stored.split("|")[1] ?? 0) : 0;
    localStorage.setItem(DAILY_KEY, `${day}|${count + 1}`);
  };

  const start = async () => {
    setError(null);
    const left = remaining();
    if (left <= 0) {
      setError(`Daily cap reached — ${DAILY_LIMIT} recordings a day is the Loom way. Come back tomorrow.`);
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: tabAudio ? { echoCancellation: false } : false,
      });
      if (displayStream.getVideoTracks().length === 0) throw new Error("no-screen");
      displayStream.getVideoTracks()[0].addEventListener("ended", () => stopRecording());
      const tracks: MediaStreamTrack[] = [...displayStream.getTracks()];
      if (mic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tracks.push(...micStream.getTracks());
        } catch {
          setError("Mic blocked — recording screen without audio.");
        }
      }
      streamRef.current = new MediaStream(tracks);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const rec = new MediaRecorder(streamRef.current, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      recRef.current = rec;
      chunksRef.current = [];
      setDone(null);
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setRecordedToday();
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setDone(URL.createObjectURL(blob));
      };
      const begin = () => {
        rec.start(250);
        setRecording(true);
        setElapsed(0);
        timerRef.current = window.setInterval(() => {
          setElapsed((e) => {
            if (e + 1 >= MAX_SECONDS) {
              stopRecording();
              return e;
            }
            return e + 1;
          });
        }, 1000);
      };
      setCountdown(3);
      const cd = setInterval(() => {
        setCountdown((c) => {
          if (c === null) return null;
          if (c === 0) {
            clearInterval(cd);
            setCountdown(null);
            begin();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      setError("Screen capture cancelled or blocked. The browser permission prompt controls this, not us.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
    setPaused(false);
  };

  const togglePause = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      clearInterval(timerRef.current);
      setPaused(true);
    } else if (rec.state === "paused") {
      rec.resume();
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      setPaused(false);
    }
  };

  const download = () => {
    if (!done) return;
    const a = document.createElement("a");
    a.href = done;
    a.download = `recording-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.webm`;
    a.click();
  };

  return (
    <ToolShell
      crumb="SCREEN-RECORDER"
      title="The demo."
      tagline="Record your screen, tab audio and mic — locally, straight to WebM. The loom-adjacent companies give you 25 videos and a watermark for a reason; the reason is your data."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">Microphone</span>
              <input
                type="checkbox"
                checked={mic}
                onChange={(e) => setMic(e.target.checked)}
                className="h-4 w-4 accent-ink"
              />
            </label>
            <label className="flex items-center justify-between rounded-md border-2 border-ink bg-surface-muted px-3 py-2.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">Tab audio</span>
              <input
                type="checkbox"
                checked={tabAudio}
                onChange={(e) => setTabAudio(e.target.checked)}
                className="h-4 w-4 accent-ink"
              />
            </label>
          </div>

          {recording && (
            <div className="mt-4 rounded-md border-2 border-ink bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-red">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red" aria-hidden="true" />
                  {paused ? "Paused" : "Recording"}
                </span>
                <span className="font-mono text-xs font-bold text-ink">{fmt(elapsed)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={togglePause} className="uppercase">
                  {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                  {paused ? "Resume" : "Pause"}
                </Button>
                <Button variant="destructive" onClick={stopRecording} className="uppercase">
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Stop
                </Button>
              </div>
            </div>
          )}

          {countdown !== null && (
            <div className="mt-4 rounded-md border-2 border-ink bg-yellow p-4 text-center">
              <p className="font-display text-5xl font-bold text-ink">{countdown > 0 ? countdown : "GO"}</p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                Choose a screen in the prompt
              </p>
            </div>
          )}

          {!recording && countdown === null && (
            <Button onClick={start} className="mt-4 w-full uppercase">
              <MonitorPlay className="h-4 w-4" aria-hidden="true" />
              Start recording
            </Button>
          )}

          <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            {remaining()}/{DAILY_LIMIT} recordings left today · {MAX_SECONDS / 60}-minute cap — your data never leaves this tab.
          </p>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Output</h2>

          {done ? (
            <div className="mt-4 flex-1 rounded-md border-2 border-ink bg-surface-muted p-4">
              <video src={done} className="w-full rounded-sm border-2 border-ink bg-ink" controls />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={download} className="uppercase">
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Download WebM
                </Button>
                <Button variant="secondary" onClick={() => setDone(null)} className="uppercase">
                  Record another
                </Button>
              </div>
              <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
                No share link, no transcript, no AI highlight reel — because nothing leaves this machine.
              </p>
            </div>
          ) : (
            <div className="mt-4 flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-ink/30 p-6">
              <p className="text-center font-mono text-xs font-bold uppercase tracking-widest text-ink/30">
                The recording lands here
                <br />
                <span className="text-[10px] font-semibold">WebM · 8 Mbps · your screen, your file</span>
              </p>
            </div>
          )}
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Recorded locally with getDisplayMedia — the paid tool's only feature is hosting your screen.
      </p>
    </ToolShell>
  );
}