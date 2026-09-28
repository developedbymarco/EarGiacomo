"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { chooseClef, displayToScore, Staff } from "@/components/notation/Staff";
import { Piano } from "@/components/piano/Piano";
import { Button } from "@/components/ui/button";
import { recordPracticeResult, type RecordResult } from "@/app/path/actions";
import { loadPiano, playMidi, playSequence, setPianoCharacter, stopPlayback, unlockAudio } from "@/lib/audio/engine";
import { CURRICULUM_NODES } from "@/lib/curriculum/seed";
import { mistakeDraft, strongest, summarize, weakest } from "@/lib/exercise/results";
import { useExerciseStore } from "@/lib/exercise/store";
import { loadSession, loadSessionMeta, saveSession, toSettings } from "@/lib/practice/settings";
import { generateSession, type Question } from "@/lib/question-generation/generate";
import { CADENCE_LABELS, cadenceGuidance, CHORD_LABELS, chordGuidance, INTERVAL_LABELS, intervalGuidance } from "@/lib/question-generation/labels";
import type { CadenceId } from "@/lib/music-theory/cadences";
import type { ChordQuality, IntervalQuality } from "@/lib/music-theory/types";

export function ExerciseSession() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const phase = useExerciseStore((state) => state.phase);
  const index = useExerciseStore((state) => state.index);
  const questions = useExerciseStore((state) => state.questions);
  const repeats = useExerciseStore((state) => state.repeats);
  const selected = useExerciseStore((state) => state.selected);
  const needsGesture = useExerciseStore((state) => state.needsGesture);
  const question = questions[index];
  const exam = useExerciseStore((state) => state.exam);

  useEffect(() => {
    const settings = loadSession();
    if (!settings) {
      router.replace("/practice");
      return;
    }
    let cancelled = false;
    const meta = loadSessionMeta();
    useExerciseStore.getState().start(generateSession(settings), meta.mode === "exam");
    loadPiano()
      .then(() => unlockAudio())
      .then((running) => {
        if (!cancelled) useExerciseStore.getState().samplesReady(running);
      })
      .catch(() => {
        if (!cancelled) useExerciseStore.getState().samplesReady(false);
      });
    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, [router]);

  useEffect(() => {
    if (phase !== "playing" || !question || question.mode !== "audio") return;
    const questionId = question.id;
    const repeatCount = repeats;
    setPianoCharacter(question.pianoInstrumentId);
    playSequence(question.playback).then(() => {
      const state = useExerciseStore.getState();
      const current = state.questions[state.index];
      if (current?.id === questionId && state.repeats === repeatCount && state.phase === "playing") {
        state.beginAnswering();
      }
    });
    return () => {
      const state = useExerciseStore.getState();
      const current = state.questions[state.index];
      const sameTake =
        current?.id === questionId &&
        state.repeats === repeatCount &&
        (state.phase === "feedback" || state.phase === "answering");
      if (!sameTake) stopPlayback();
    };
  }, [phase, question, repeats]);

  useEffect(() => () => stopPlayback(), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " " && question?.mode === "audio") {
        event.preventDefault();
        useExerciseStore.getState().repeat();
      }
      if (event.key === "Enter" && useExerciseStore.getState().phase === "feedback") {
        event.preventDefault();
        useExerciseStore.getState().continue();
      }
      const number = Number(event.key);
      const choices = question ? answerChoices(question) : [];
      const answerPhase = useExerciseStore.getState().phase;
      if (event.key >= "1" && event.key <= "9" && number <= choices.length && (answerPhase === "answering" || answerPhase === "playing")) {
        event.preventDefault();
        useExerciseStore.getState().answer(choices[number - 1]!);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question]);

  const playKey = useCallback((midi: number) => {
    if (useExerciseStore.getState().phase === "playing") return;
    void playMidi(midi);
  }, []);

  if (!question && phase !== "results") {
    return <p className="text-parchment">Setting the desk…</p>;
  }

  if (phase === "results") {
    const meta = loadSessionMeta();
    const destination = meta.mode === "practice" ? "/practice" : meta.mode === "exam" ? "/exam" : "/path";
    const againLabel = meta.mode === "practice" ? "New practice" : meta.mode === "exam" ? "Back to exams" : "Back to the path";
    return <Results onAgain={() => router.push(destination)} againLabel={againLabel} />;
  }

  if (!question) return null;
  const choices = answerChoices(question);
  const correctValue = correctAnswer(question);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm text-parchment">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>{question.mode === "audio" ? "Listening" : question.mode === "staff" ? "Staff" : "Piano"}</span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/15"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-valuenow={index + 1}
          aria-label="Session progress"
        >
          <div className="h-full bg-gold" style={{ width: `${(index / questions.length) * 100}%` }} />
        </div>
      </div>

      <section className="rounded-3xl bg-parchment p-4 text-espresso shadow-xl sm:p-6">
        {question.mode === "staff" ? (
          <>
            <p className="mb-2 text-center font-serif text-3xl">
              {question.type === "cadence" ? "Name the progression" : "Name what is written"}
            </p>
            <Staff
              scoreNotes={question.spelled.map(displayToScore)}
              groups={question.type === "cadence" ? question.spelledChords.map((chord) => chord.map(displayToScore)) : undefined}
              clef={chooseClef(question.notes)}
            />
          </>
        ) : question.mode === "piano" ? (
          <p className="mb-2 text-center font-serif text-4xl">Name the highlighted keys</p>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <p className="font-serif text-4xl">
              {phase === "playing" ? "Listen" : needsGesture ? "The piano is ready" : question.type === "cadence" ? "Name the progression" : "What did you hear?"}
            </p>
            {exam ? <p className="mt-2 text-espresso/70">Scored at the end.</p> : null}
            <p className="mt-2 text-espresso/70">{describeStimulus(question)}</p>
          </div>
        )}
        <div className="mt-4">
          <Piano
            low={pianoBounds(question.notes).low}
            high={pianoBounds(question.notes).high}
            highlighted={highlightedNotes(question, phase, exam)}
            interactive={phase !== "playing"}
            onPlay={playKey}
          />
          <p className="mt-2 text-sm text-espresso/70">
            Letter keys play the piano. Number keys choose an answer. Space repeats a listening question.
          </p>
        </div>
      </section>

      {needsGesture && question.mode === "audio" ? (
        <Button
          type="button"
          onClick={() => {
            void unlockAudio().then((running) => {
              if (running) useExerciseStore.getState().beginPlaying();
            });
          }}
        >
          Play the question
        </Button>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Answers">
        {choices.map((choice, choiceIndex) => {
          const isSelected = selected === choice;
          const isCorrect = phase === "feedback" && choice === correctValue;
          const isWrong = phase === "feedback" && isSelected && !isCorrect;
          return (
            <button
              key={choice}
              type="button"
              disabled={phase !== "answering" && phase !== "playing"}
              onClick={() => useExerciseStore.getState().answer(choice)}
              className={`rounded-2xl border px-4 py-4 text-left text-lg disabled:cursor-default ${
                isCorrect
                  ? "border-sage bg-sage text-espresso"
                  : isWrong
                    ? "border-burgundy bg-burgundy text-cream"
                    : "border-cream/20 bg-plum/50 text-cream"
              }`}
            >
              <span className="mr-3 text-gold">{choiceIndex + 1}</span>
              {labelFor(question, choice)}
              {isCorrect ? <span className="mt-1 block text-sm">Correct</span> : null}
              {isWrong ? <span className="mt-1 block text-sm">Your answer</span> : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        {question.mode === "audio" ? (
          <Button type="button" variant="ghost" onClick={() => useExerciseStore.getState().repeat()} disabled={phase === "playing" || phase === "loading"}>
            Repeat
          </Button>
        ) : null}
        {phase === "feedback" ? (
          <Button type="button" onClick={() => useExerciseStore.getState().continue()}>
            Continue
          </Button>
        ) : null}
      </div>

      {phase === "feedback" ? (
        <motion.section
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-gold/30 bg-plum/60 p-5"
          aria-live="polite"
        >
          <p className="text-lg text-cream">
            You chose {labelFor(question, selected ?? "")}. Correct answer: {labelFor(question, correctValue)}.
          </p>
          <p className="mt-2 text-parchment">{guidance(question, selected)}</p>
          <p className="mt-3 font-serif text-2xl text-gold">{question.spelled.join("  ·  ")}</p>
          {repeats > 0 ? <p className="mt-2 text-sm text-parchment">Repeated {repeats} {repeats === 1 ? "time" : "times"}.</p> : null}
        </motion.section>
      ) : null}
    </div>
  );
}

const recordedResults = new Map<string, Promise<{ note: string | null; giacominos: number; xp: number; refresh: boolean }>>();

function Results({ onAgain, againLabel }: { onAgain: () => void; againLabel: string }) {
  const router = useRouter();
  const records = useExerciseStore((state) => state.records);
  const [saved, setSaved] = useState<{ note: string | null; giacominos: number; xp: number } | null>(null);
  const scores = summarize(records);
  const best = strongest(scores);
  const review = weakest(scores.filter((score) => score.correct < score.total));
  const correct = records.filter((record) => record.correct).length;
  const repeats = records.reduce((sum, record) => sum + record.repeats, 0);
  const meta = loadSessionMeta();

  useEffect(() => {
    const settings = loadSession();
    const token = settings?.seed;
    if (!token || records.length === 0) return;
    let pending = recordedResults.get(token);
    if (!pending) {
      pending = recordPracticeResult({
        mode: meta.mode === "exam" ? "practice" : meta.mode,
        nodeSlug: meta.mode === "exam" ? null : meta.nodeSlug,
        token,
        attempts: records.map((record) => ({
          conceptKey: record.conceptKey,
          chosenKey: record.chosenKey,
          correct: record.correct,
          repeats: record.repeats,
        })),
      }).then((result) => ({
        note: savedMessage(result, meta.mode),
        giacominos: result.saved && !result.duplicate ? result.giacominosEarned : 0,
        xp: result.saved && !result.duplicate ? result.xpEarned : 0,
        refresh: result.saved && !result.duplicate,
      }));
      recordedResults.set(token, pending);
    }
    let cancelled = false;
    void pending.then((outcome) => {
      if (cancelled) return;
      setSaved({ note: outcome.note, giacominos: outcome.giacominos, xp: outcome.xp });
      if (outcome.refresh) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [meta.mode, meta.nodeSlug, records, router]);

  function practiceMistakes() {
    const settings = loadSession();
    if (!settings) return;
    const draft = mistakeDraft(
      {
        count: settings.count,
        rangeLow: settings.rangeLow,
        rangeHigh: settings.rangeHigh,
        intervals: settings.intervals,
        triads: settings.triads,
        sevenths: settings.sevenths,
        directions: settings.directions,
        presentations: settings.presentations,
        modes: settings.modes,
        pianoId: settings.pianoInstrumentId,
        voicing: settings.voicing,
        mixedInversions: (settings.inversions?.length ?? 0) > 1,
      },
      records,
    );
    if (!draft) return;
    const next = toSettings(draft, crypto.randomUUID());
    saveSession(next);
    useExerciseStore.getState().start(generateSession(next));
    useExerciseStore.getState().samplesReady(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-5xl text-cream">
        {correct} / {records.length} correct
      </h1>
      {best ? (
        <p className="text-lg text-parchment">
          Strongest: {best.label} — {Math.round((best.correct / best.total) * 100)}%
        </p>
      ) : null}
      {review ? (
        <p className="text-lg text-parchment">
          Needs review: {review.label} — {Math.round((review.correct / review.total) * 100)}%
        </p>
      ) : (
        <p className="text-lg text-parchment">Every concept in this session was solid.</p>
      )}
      {meta.mode === "exam" ? (
        <ul className="space-y-1 text-parchment">
          {scores.map((score) => (
            <li key={score.key}>
              {score.label}: {score.correct} of {score.total} ({Math.round((score.correct / score.total) * 100)}%)
            </li>
          ))}
        </ul>
      ) : null}
      {repeats > 0 ? <p className="text-parchment">Repeats this session: {repeats}</p> : null}
      {saved && saved.giacominos > 0 ? (
        <RoundPayout questions={records.length} correct={correct} giacominos={saved.giacominos} xp={saved.xp} />
      ) : saved ? null : (
        <p className="text-parchment">Saving this round…</p>
      )}
      {saved?.note ? <p className="text-parchment">{saved.note}</p> : null}
      <div className="flex flex-wrap gap-3">
        {records.some((record) => !record.correct) ? (
          <Button type="button" onClick={practiceMistakes}>
            Practice mistakes
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={onAgain}>
          {againLabel}
        </Button>
      </div>
    </div>
  );
}

function RoundPayout({ questions, correct, giacominos, xp }: { questions: number; correct: number; giacominos: number; xp: number }) {
  const play = questions * 2;
  const fromAnswers = correct * 8;
  const bonus = giacominos - play - fromAnswers;
  const parts = [
    `${play} for finishing`,
    correct > 0 ? `${fromAnswers} for correct answers` : null,
    bonus > 0 ? `${bonus} for the lesson` : null,
  ].filter((part): part is string => Boolean(part));
  return (
    <section className="rounded-3xl border-2 border-gold bg-plum px-6 py-6" aria-live="polite">
      <p className="font-serif text-6xl text-gold">+{giacominos}</p>
      <p className="text-xl text-cream">Giacominos this round</p>
      {bonus >= 0 ? <p className="mt-2 text-parchment">{parts.join(" · ")}</p> : null}
      {xp > 0 ? <p className="mt-3 text-lg text-parchment">+{xp} XP</p> : null}
    </section>
  );
}

function savedMessage(result: RecordResult, mode: "practice" | "guided" | "review" | "exam"): string | null {
  if (!result.saved) {
    return result.reason === "unavailable" ? "This session stayed on this browser. It was not saved to your account." : null;
  }
  if (result.duplicate) return null;
  const opened = result.unlocked.map((slug) => CURRICULUM_NODES.find((node) => node.slug === slug)?.title ?? slug);
  const shop = result.purchasable.map((lesson) => {
    const title = CURRICULUM_NODES.find((node) => node.slug === lesson.slug)?.title ?? lesson.slug;
    return `${title} for ${lesson.cost} Giacominos`;
  });
  const parts = [
    result.passed ? "Lesson passed." : null,
    opened.length > 0 ? `Opened ${opened.join(" and ")}.` : null,
    shop.length > 0 ? `${shop.join(" and ")} can be unlocked.` : null,
  ].filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(" ");
  if (mode === "guided") return "Saved. Eight of ten opens the next step.";
  return "Saved to your mastery.";
}

function answerChoices(question: Question): string[] {
  return question.type === "interval" ? question.answerChoices : question.answerChoices;
}

function highlightedNotes(question: Question, phase: string, exam: boolean): number[] {
  if (question.mode === "piano") return question.notes;
  if (!exam && phase === "feedback") return question.notes;
  return [];
}

function correctAnswer(question: Question): string {
  if (question.type === "interval") return question.interval;
  if (question.type === "chord") return question.quality;
  return question.cadenceId;
}

function labelFor(question: Question, choice: string): string {
  if (question.type === "interval") return INTERVAL_LABELS[choice as IntervalQuality] ?? choice;
  if (question.type === "cadence") return CADENCE_LABELS[choice as CadenceId] ?? choice;
  return CHORD_LABELS[choice as ChordQuality] ?? choice;
}

function guidance(question: Question, selected: string | null): string {
  if (question.type === "interval") {
    return intervalGuidance(question.interval, (selected as IntervalQuality) ?? question.interval);
  }
  if (question.type === "cadence") return cadenceGuidance(question.cadenceId);
  return chordGuidance(question.quality);
}

function describeStimulus(question: Question): string {
  if (question.mode === "piano") return "Name what the highlighted keys spell.";
  if (question.mode === "staff") return "Name what is written on the staff.";
  if (question.type === "cadence") return "Two chords";
  if (question.type === "interval" && question.direction === "ascending") return "Ascending";
  if (question.type === "interval" && question.direction === "descending") return "Descending";
  if (question.type === "chord" && question.presentation === "melodicAscending") return "Ascending";
  if (question.type === "chord" && question.presentation === "melodicDescending") return "Descending";
  return "Harmonic";
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
