import { PREVIEW_PLAYBACK, PIANO_SAMPLES } from "@/lib/audio/samples";
import { midiToNoteName } from "@/lib/music-theory/notes";

const MELODIC_GAP = 0.6;
const MELODIC_HOLD = 0.7;
const CHORD_HOLD = 1.5;
const PROGRESSION_GAP = 1.7;

const CHARACTERS: Record<string, { velocity: number; holdScale: number; filterHz: number }> = {
  "concert-grand": { velocity: 0.82, holdScale: 1, filterHz: 12000 },
  "warm-felt": { velocity: 0.55, holdScale: 1.2, filterHz: 880 },
  "bright-classical": { velocity: 0.94, holdScale: 0.72, filterHz: 6500 },
};

let sampler: import("tone").Sampler | null = null;
let filter: import("tone").Filter | null = null;
let loading: Promise<void> | null = null;
let playToken = 0;
let character = CHARACTERS["concert-grand"]!;

export function setPianoCharacter(id: string): void {
  character = CHARACTERS[id] ?? CHARACTERS["concert-grand"]!;
  if (filter) filter.frequency.value = character.filterHz;
}

export async function loadPiano(): Promise<void> {
  if (sampler?.loaded) return;
  if (!loading) {
    loading = (async () => {
      const Tone = await import("tone");
      sampler = new Tone.Sampler({
        urls: PIANO_SAMPLES,
        baseUrl: "/samples/piano/",
        release: 1.4,
      });
      filter = new Tone.Filter(character.filterHz, "lowpass");
      sampler.connect(filter);
      filter.toDestination();
      await Tone.loaded();
    })();
  }
  await loading;
}

export async function unlockAudio(): Promise<boolean> {
  const Tone = await import("tone");
  await Tone.start();
  return Tone.getContext().state === "running";
}

export function stopPlayback(): void {
  playToken += 1;
  sampler?.releaseAll();
}

export async function playSequence(groups: number[][]): Promise<void> {
  if (groups.length === 0) return;
  await loadPiano();
  const Tone = await import("tone");
  stopPlayback();
  const token = playToken;
  const start = Tone.now() + 0.06;
  filter?.frequency.setValueAtTime(character.filterHz, start);
  const progression = groups.length > 1 && groups.every((group) => group.length > 1);
  const gap = progression ? PROGRESSION_GAP : MELODIC_GAP;
  groups.forEach((group, index) => {
    const hold = (group.length > 1 ? CHORD_HOLD : MELODIC_HOLD) * character.holdScale;
    sampler?.triggerAttackRelease(group.map(midiToNoteName), hold, start + index * gap, character.velocity);
  });
  const lastHold = (groups[groups.length - 1]!.length > 1 ? CHORD_HOLD : MELODIC_HOLD) * character.holdScale;
  const seconds = (groups.length - 1) * gap + lastHold + 0.08;
  await delay(seconds * 1000);
  if (token !== playToken) return;
}

export async function playMidi(midi: number): Promise<void> {
  await loadPiano();
  const Tone = await import("tone");
  if (Tone.getContext().state !== "running") {
    await Tone.start();
  }
  sampler?.triggerAttackRelease(midiToNoteName(midi), 0.85 * character.holdScale, Tone.now(), character.velocity);
}

export function previewPiano(id = "concert-grand"): Promise<void> {
  setPianoCharacter(id);
  return playSequence(PREVIEW_PLAYBACK);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
