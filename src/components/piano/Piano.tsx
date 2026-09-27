"use client";

import { useEffect } from "react";
import { midiToNoteName } from "@/lib/music-theory/notes";

const WHITE_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];
const BLACK_KEYS = ["w", "e", "t", "y", "u"];

export function Piano({
  low,
  high,
  highlighted,
  interactive,
  onPlay,
}: {
  low: number;
  high: number;
  highlighted: number[];
  interactive: boolean;
  onPlay: (midi: number) => void;
}) {
  const notes = Array.from({ length: high - low + 1 }, (_, index) => low + index);
  const whites = notes.filter((midi) => !isBlack(midi));
  const blacks = notes.filter((midi) => isBlack(midi));

  useEffect(() => {
    const whiteNotes = Array.from({ length: high - low + 1 }, (_, index) => low + index).filter(
      (midi) => !isBlack(midi),
    );
    const blackNotes = Array.from({ length: high - low + 1 }, (_, index) => low + index).filter((midi) =>
      isBlack(midi),
    );
    function onKeyDown(event: KeyboardEvent) {
      if (!interactive || event.repeat || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = event.key.toLowerCase();
      const whiteIndex = WHITE_KEYS.indexOf(key);
      if (whiteIndex >= 0 && whiteNotes[whiteIndex] !== undefined) {
        event.preventDefault();
        onPlay(whiteNotes[whiteIndex]);
        return;
      }
      const blackIndex = BLACK_KEYS.indexOf(key);
      if (blackIndex >= 0 && blackNotes[blackIndex] !== undefined) {
        event.preventDefault();
        onPlay(blackNotes[blackIndex]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [high, interactive, low, onPlay]);

  return (
    <div className="relative h-36 select-none" aria-label="Piano">
      <div className="flex h-full">
        {whites.map((midi) => (
          <button
            key={midi}
            type="button"
            disabled={!interactive}
            aria-label={midiToNoteName(midi)}
            aria-pressed={highlighted.includes(midi)}
            onClick={() => onPlay(midi)}
            className={`h-full flex-1 border border-espresso/30 ${
              highlighted.includes(midi) ? "bg-gold" : "bg-parchment"
            } disabled:opacity-80`}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {blacks.map((midi) => {
          const whiteIndex = whites.filter((white) => white < midi).length - 1;
          const left = ((whiteIndex + 1) / whites.length) * 100;
          return (
            <button
              key={midi}
              type="button"
              disabled={!interactive}
              aria-label={midiToNoteName(midi)}
              aria-pressed={highlighted.includes(midi)}
              onClick={() => onPlay(midi)}
              style={{ left: `calc(${left}% - 0.7rem)` }}
              className={`pointer-events-auto absolute top-0 h-20 w-6 rounded-b-md border border-espresso ${
                highlighted.includes(midi) ? "bg-gold text-espresso" : "bg-espresso"
              } disabled:opacity-80`}
            />
          );
        })}
      </div>
    </div>
  );
}

function isBlack(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
}
