"use client";

import { useEffect, useId, useRef } from "react";
import { Factory, Renderer } from "vexflow";

export function Staff({
  scoreNotes,
  clef,
  groups,
}: {
  scoreNotes: string[];
  clef: "treble" | "bass";
  groups?: string[][];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementId = `staff-${useId().replaceAll(":", "")}`;

  const writtenGroups = groups && groups.length > 0 ? groups : [scoreNotes];
  const signature = writtenGroups.map((group) => group.join("|")).join("||");

  useEffect(() => {
    const host = hostRef.current;
    const chords = signature.split("||").map((group) => group.split("|").filter(Boolean)).filter((group) => group.length > 0);
    if (!host || chords.length === 0) return;
    host.replaceChildren();
    const width = Math.max(host.clientWidth, chords.length > 1 ? 460 : 320);
    const factory = new Factory({
      renderer: {
        elementId,
        width,
        height: 168,
        backend: Renderer.Backends.SVG,
      },
    });
    const score = factory.EasyScore();
    score.set({ clef });
    const written = chords
      .map((group) => (group.length === 1 ? `${group[0]}/w` : `(${group.join(" ")})/w`))
      .join(", ");
    const system = factory.System({ width: width - 16 });
    system.addStave({ voices: [score.voice(score.notes(written))] }).addClef(clef);
    factory.draw();
    const svg = host.querySelector("svg");
    svg?.setAttribute("role", "img");
    svg?.setAttribute("aria-label", `${clef} staff`);
    return () => {
      host.replaceChildren();
    };
  }, [clef, elementId, signature]);

  return <div id={elementId} ref={hostRef} className="min-h-40 w-full" />;
}

export function chooseClef(notes: number[]): "treble" | "bass" {
  const average = notes.reduce((sum, note) => sum + note, 0) / notes.length;
  return average < 60 ? "bass" : "treble";
}

export function displayToScore(name: string): string {
  return name.replaceAll("𝄫", "bb").replaceAll("𝄪", "##").replaceAll("♭", "b").replaceAll("♯", "#");
}
