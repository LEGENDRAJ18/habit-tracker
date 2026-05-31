type SoundType = "complete" | "levelup" | "streak" | "milestone";

let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return ctx;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.22,
) {
  const a = ac();
  const osc  = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(a.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, a.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur);
}

export function playSound(type: SoundType) {
  if (typeof window === "undefined" || localStorage.getItem("habitai_sounds") !== "on") return;
  try {
    switch (type) {
      case "complete":
        // Quick two-note "ding ding" ✓
        tone(523.25, 0,    0.18);
        tone(783.99, 0.09, 0.28);
        break;

      case "levelup":
        // Triumphant C-major arpeggio ✓
        tone(261.63, 0,    0.5, "triangle", 0.18);
        tone(329.63, 0.12, 0.5, "triangle", 0.18);
        tone(392.00, 0.24, 0.5, "triangle", 0.18);
        tone(523.25, 0.36, 0.8, "triangle", 0.22);
        break;

      case "streak":
        // Ascending sawtooth sweep
        {
          const a = ac();
          const osc  = a.createOscillator();
          const gain = a.createGain();
          osc.connect(gain);
          gain.connect(a.destination);
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(180, a.currentTime);
          osc.frequency.exponentialRampToValueAtTime(720, a.currentTime + 0.35);
          gain.gain.setValueAtTime(0.12, a.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.4);
          osc.start(a.currentTime);
          osc.stop(a.currentTime + 0.4);
        }
        break;

      case "milestone":
        // Cheerful three-note jingle
        tone(659.25, 0,    0.22);
        tone(783.99, 0.1,  0.22);
        tone(1046.5, 0.2,  0.35);
        break;
    }
  } catch {
    // AudioContext blocked or unavailable — silently skip
  }
}
