/**
 * Livora chime — nada dering chat.
 *
 * Disintesis lewat WebAudio (tanpa file audio) supaya ringan dan bisa dipakai
 * di sisi user maupun admin. Karakter suara: dua nada bell lembut (F#5 → A#5)
 * dengan decay panjang — hangat, "gold", tidak mengagetkan; selaras dengan
 * bahasa desain Livora.
 */

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Browser butuh gesture user sebelum audio boleh berbunyi. */
export function unlockChatSound() {
  if (unlocked) return;
  unlocked = true;
  getCtx();
}

function bell(audio: AudioContext, freq: number, at: number, gain: number, dur: number) {
  const osc = audio.createOscillator();
  const partial = audio.createOscillator();
  const vol = audio.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;
  partial.type = "sine";
  partial.frequency.value = freq * 2.02; // sedikit inharmonic -> terdengar seperti bell
  const partialVol = audio.createGain();
  partialVol.gain.value = 0.22;

  vol.gain.setValueAtTime(0.0001, at);
  vol.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  osc.connect(vol);
  partial.connect(partialVol);
  partialVol.connect(vol);
  vol.connect(audio.destination);

  osc.start(at);
  partial.start(at);
  osc.stop(at + dur + 0.05);
  partial.stop(at + dur + 0.05);
}

/**
 * @param variant "incoming" — pesan masuk (dua nada naik)
 *                "sent"     — pesan terkirim (satu nada pendek, sangat halus)
 *                "alert"    — peringatan idle (tiga ketuk lembut)
 */
export function playChatSound(variant: "incoming" | "sent" | "alert" = "incoming") {
  try {
    const audio = getCtx();
    if (!audio) return;
    const t = audio.currentTime + 0.01;

    if (variant === "sent") {
      bell(audio, 1174.66, t, 0.05, 0.5); // D6
      return;
    }
    if (variant === "alert") {
      bell(audio, 987.77, t, 0.07, 0.45);
      bell(audio, 987.77, t + 0.18, 0.06, 0.45);
      bell(audio, 739.99, t + 0.36, 0.06, 0.9);
      return;
    }
    bell(audio, 739.99, t, 0.09, 0.9); // F#5
    bell(audio, 932.33, t + 0.13, 0.08, 1.4); // A#5
  } catch {
    /* silent */
  }
}
