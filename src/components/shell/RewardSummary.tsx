"use client";

import { useEffect, useId, useRef, useState } from "react";
import { levelForXp, xpToReachLevel } from "@/lib/economy/rewards";

export function RewardSummary({
  xp,
  giacominos,
  layout = "inline",
}: {
  xp: number;
  giacominos: number;
  layout?: "inline" | "menu";
}) {
  const level = levelForXp(xp);
  const floor = xpToReachLevel(level);
  const next = xpToReachLevel(level + 1);
  const span = Math.max(1, next - floor);
  const intoLevel = Math.max(0, xp - floor);
  const fraction = Math.min(1, intoLevel / span);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className={layout === "menu" ? "relative py-1" : "relative"} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream ${
          layout === "menu" ? "w-full justify-between" : ""
        } ${open ? "border-gold bg-plum" : "border-gold/70 bg-plum/70 hover:border-gold hover:bg-plum"}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          Level {level} · {giacominos} Giacominos
        </span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-4 text-gold ${open ? "rotate-180" : ""}`}>
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Level and Giacominos"
          className={`absolute z-20 mt-2 rounded-3xl border border-gold/40 bg-plum p-5 text-left shadow-xl ${
            layout === "menu" ? "left-0 w-full" : "right-0 w-72 max-w-[calc(100vw-2rem)]"
          }`}
        >
          <p className="font-serif text-3xl text-cream">Level {level}</p>
          <div
            className="mt-4 h-3 overflow-hidden rounded-full bg-espresso"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={span}
            aria-valuenow={intoLevel}
            aria-label="Experience toward the next level"
          >
            <div className="h-full rounded-full bg-gold" style={{ width: `${fraction * 100}%` }} />
          </div>
          <p className="mt-2 text-sm text-parchment">
            {intoLevel} of {span} XP toward level {level + 1}
          </p>
          <p className="mt-5 font-serif text-4xl text-gold">{giacominos}</p>
          <p className="text-parchment">Giacominos</p>
        </div>
      ) : null}
    </div>
  );
}
