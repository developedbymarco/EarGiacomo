"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { forfeitBattleAction, pulseBattle, submitBattleAnswer } from "@/app/battles/actions";
import { chooseClef, displayToScore, Staff } from "@/components/notation/Staff";
import { Piano } from "@/components/piano/Piano";
import { Button } from "@/components/ui/button";
import { loadPiano, playMidi, playSequence, setPianoCharacter, stopPlayback, unlockAudio } from "@/lib/audio/engine";
import { describeBattleResult, presetLabel, stakeLabel } from "@/lib/battles/rules";
import type { BattleStimulus, BattleView } from "@/lib/battles/types";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import type { CadenceId } from "@/lib/music-theory/cadences";
import type { ChordQuality, IntervalQuality } from "@/lib/music-theory/types";
import { CADENCE_LABELS, cadenceGuidance, CHORD_LABELS, chordGuidance, INTERVAL_LABELS, intervalGuidance } from "@/lib/question-generation/labels";

export function BattleRoom({ battle }: { battle: BattleView }) {
  const router = useRouter();
  const question = battle.question;
  const questionKey = `${battle.status}:${battle.questionIndex ?? "none"}:${battle.you.answered}`;
  const [phase, setPhase] = useState<Phase>(openingPhase(battle));
  const [seenKey, setSeenKey] = useState(questionKey);
  const [feedback, setFeedback] = useState<{ chosen: string; correct: boolean; correctAnswer: string; spelled: string[]; awarded: number } | null>(null);
  const [scores, setScores] = useState({ yours: battle.you.score, theirs: battle.them.score, theirAnswered: battle.them.answered });
  const [finished, setFinished] = useState(battle.status !== "active");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (seenKey !== questionKey) {
    setSeenKey(questionKey);
    setFeedback(null);
    setError(null);
    setPhase(openingPhase(battle));
    setFinished(battle.status !== "active");
    setScores({ yours: battle.you.score, theirs: battle.them.score, theirAnswered: battle.them.answered });
  }

  useEffect(() => {
    let cancelled = false;
    loadPiano()
      .then(() => unlockAudio())
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stopPlayback();
      void cancelled;
    };
  }, []);

  useEffect(() => {
    if (!question || question.mode !== "audio" || phase !== "listen") return;
    setPianoCharacter(question.pianoInstrumentId);
    let cancelled = false;
    playSequence(question.playback).then(() => {
      if (!cancelled) setPhase("answer");
    });
    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, [phase, question]);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      const pulse = await pulseBattle(battle.id);
      if (stopped || !pulse) return;
      setScores({ yours: pulse.yourScore, theirs: pulse.theirScore, theirAnswered: pulse.theirAnswered });
      if (pulse.status !== "active") {
        setFinished(true);
        router.refresh();
      }
    }
    const timer = setInterval(() => void tick(), 3000);
    const supabase = createSupabaseBrowser();
    const channel = supabase
      ?.channel(`battle:${battle.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "battles", filter: `id=eq.${battle.id}` }, () => void tick())
      .subscribe();
    return () => {
      stopped = true;
      clearInterval(timer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [battle.id, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey || !question) return;
      if (event.key === " " && question.mode === "audio") {
        event.preventDefault();
        setPhase("listen");
      }
      const number = Number(event.key);
      if (event.key >= "1" && event.key <= "9" && number <= question.answerChoices.length && (phase === "listen" || phase === "answer")) {
        event.preventDefault();
        void choose(question.answerChoices[number - 1]!);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function choose(answer: string) {
    if (!question || battle.questionIndex == null || busy || phase === "feedback") return;
    setBusy(true);
    setError(null);
    const result = await submitBattleAnswer(battle.id, battle.questionIndex, answer);
    setBusy(false);
    if ("error" in result) {
      setError(result.error === "broke" ? "A balance changed before the score could be saved." : "That answer could not be saved.");
      return;
    }
    setFeedback({ chosen: answer, correct: result.correct, correctAnswer: result.correctAnswer, spelled: result.spelled, awarded: result.awarded });
    setScores({ yours: result.yourScore, theirs: result.theirScore, theirAnswered: result.theirAnswered });
    if (result.status !== "active") {
      setFinished(true);
      router.refresh();
    }
    setPhase(result.yourAnswered >= result.questionCount ? (result.status === "active" ? "wait" : "done") : "feedback");
  }

  return (
    <div className="space-y-6">
      <Scoreboard
        you={battle.you.displayName || battle.you.username}
        them={battle.them.displayName || battle.them.username}
        yours={scores.yours}
        theirs={scores.theirs}
        preset={presetLabel(battle.preset)}
        stake={stakeLabel(battle.stake)}
        answered={battle.you.answered}
        total={battle.questionCount}
      />
      {question && phase !== "wait" && phase !== "done" ? (
        <QuestionPanel question={question} phase={phase} feedback={feedback} busy={busy} onChoose={(answer) => void choose(answer)} onRepeat={() => setPhase("listen")} />
      ) : null}
      {phase === "feedback" ? (
        <Button type="button" onClick={() => router.refresh()}>
          Next question
        </Button>
      ) : null}
      {phase === "wait" ? (
        <p className="text-lg text-parchment">
          {battle.you.answered > 0
            ? `Your answers are in. Waiting for ${battle.them.displayName || battle.them.username}.`
            : "The questions are not on the desk yet. Reload this match in a moment."}
        </p>
      ) : null}
      {finished || phase === "done" ? (
        <p className="text-lg text-cream">{describeBattleResult({ winner: battle.winner, stake: battle.stake, refunded: battle.refunded })}</p>
      ) : null}
      {error ? <p className="text-rose">{error}</p> : null}
      {battle.status === "active" && !finished ? (
        <form action={forfeitBattleAction}>
          <input type="hidden" name="id" value={battle.id} />
          <Button type="submit" variant="ghost">
            Leave match
          </Button>
          <p className="mt-2 text-sm text-parchment/80">Leaving before three answers returns both fees. After that, the other player wins.</p>
        </form>
      ) : null}
    </div>
  );
}

type Phase = "listen" | "answer" | "feedback" | "wait" | "done";

function openingPhase(battle: BattleView): Phase {
  if (battle.status !== "active") return "done";
  if (!battle.question) return "wait";
  return battle.question.mode === "audio" ? "listen" : "answer";
}

function Scoreboard({
  you,
  them,
  yours,
  theirs,
  preset,
  stake,
  answered,
  total,
}: {
  you: string;
  them: string;
  yours: number;
  theirs: number;
  preset: string;
  stake: string;
  answered: number;
  total: number;
}) {
  return (
    <section className="rounded-3xl border border-gold/30 bg-plum/40 p-5">
      <p className="text-parchment">
        {preset} · {stake} · {answered >= total ? "Answers in" : `Question ${answered + 1} of ${total}`}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="font-serif text-3xl text-cream">
          {you} <span className="text-gold">{yours}</span>
        </p>
        <p className="font-serif text-3xl text-cream sm:text-right">
          {them} <span className="text-gold">{theirs}</span>
        </p>
      </div>
    </section>
  );
}

function QuestionPanel({
  question,
  phase,
  feedback,
  busy,
  onChoose,
  onRepeat,
}: {
  question: BattleStimulus;
  phase: "listen" | "answer" | "feedback" | "wait" | "done";
  feedback: { chosen: string; correct: boolean; correctAnswer: string; spelled: string[]; awarded: number } | null;
  busy: boolean;
  onChoose: (answer: string) => void;
  onRepeat: () => void;
}) {
  const bounds = pianoBounds(question.notes);
  return (
    <>
      <section className="rounded-3xl bg-parchment p-4 text-espresso shadow-xl sm:p-6">
        {question.mode === "staff" && question.spelled ? (
          <>
            <p className="mb-2 text-center font-serif text-3xl">{question.type === "cadence" ? "Name the progression" : "Name what is written"}</p>
            <Staff
              scoreNotes={question.spelled.map(displayToScore)}
              groups={question.spelledChords?.map((chord) => chord.map(displayToScore))}
              clef={chooseClef(question.notes)}
            />
          </>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <p className="font-serif text-4xl">{phase === "listen" ? "Listen" : "What did you hear?"}</p>
            <p className="mt-2 text-espresso/70">{question.hint}</p>
          </div>
        )}
        <div className="mt-4">
          <Piano
            low={bounds.low}
            high={bounds.high}
            highlighted={question.mode === "piano" ? question.notes : []}
            interactive={phase !== "listen"}
            onPlay={(midi) => void playMidi(midi)}
          />
        </div>
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Answers">
        {question.answerChoices.map((choice, index) => {
          const showCorrect = phase === "feedback" && feedback?.correctAnswer === choice;
          const showWrong = phase === "feedback" && feedback?.chosen === choice && feedback.correctAnswer !== choice;
          return (
            <button
              key={choice}
              type="button"
              disabled={busy || phase === "feedback"}
              onClick={() => onChoose(choice)}
              className={`rounded-2xl border px-4 py-4 text-left text-lg disabled:cursor-default ${
                showCorrect ? "border-sage bg-sage text-espresso" : showWrong ? "border-burgundy bg-burgundy text-cream" : "border-cream/20 bg-plum/50 text-cream"
              }`}
            >
              <span className="mr-3 text-gold">{index + 1}</span>
              {labelFor(question, choice)}
              {showCorrect ? <span className="mt-1 block text-sm">Correct</span> : null}
              {showWrong ? <span className="mt-1 block text-sm">Your answer</span> : null}
            </button>
          );
        })}
      </div>
      {question.mode === "audio" && phase !== "feedback" ? (
        <Button type="button" variant="ghost" onClick={onRepeat} disabled={phase === "listen"}>
          Repeat
        </Button>
      ) : null}
      {phase === "feedback" && feedback ? (
        <section className="rounded-3xl border border-gold/30 bg-plum/60 p-5" aria-live="polite">
          <p className="text-lg text-cream">
            {feedback.correct ? "Correct" : "Not this time"}. {labelFor(question, feedback.correctAnswer)}. +{feedback.awarded}
          </p>
          <p className="mt-2 text-parchment">{guidanceFor(question, feedback.correctAnswer)}</p>
          {feedback.spelled.length > 0 ? <p className="mt-3 font-serif text-2xl text-gold">{feedback.spelled.join("  ·  ")}</p> : null}
        </section>
      ) : null}
    </>
  );
}

function labelFor(question: BattleStimulus, choice: string): string {
  if (question.type === "interval") return INTERVAL_LABELS[choice as IntervalQuality] ?? choice;
  if (question.type === "cadence") return CADENCE_LABELS[choice as CadenceId] ?? choice;
  return CHORD_LABELS[choice as ChordQuality] ?? choice;
}

function guidanceFor(question: BattleStimulus, correct: string): string {
  if (question.type === "interval") return intervalGuidance(correct as IntervalQuality, correct as IntervalQuality);
  if (question.type === "cadence") return cadenceGuidance(correct as CadenceId);
  return chordGuidance(correct as ChordQuality);
}

function pianoBounds(notes: number[]): { low: number; high: number } {
  const lowest = Math.min(...notes);
  const highest = Math.max(...notes);
  const pitchClass = ((lowest % 12) + 12) % 12;
  const low = Math.max(36, lowest - pitchClass);
  const high = Math.min(108, Math.max(highest, low + 19));
  return { low, high };
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
  );
}
