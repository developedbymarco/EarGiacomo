import { create } from "zustand";
import type { Question } from "@/lib/question-generation/generate";
import { conceptKey } from "@/lib/question-generation/labels";

export type ExercisePhase = "loading" | "playing" | "answering" | "feedback" | "results";

export interface Attempt {
  questionId: string;
  conceptKey: string;
  chosenKey: string;
  correct: boolean;
  repeats: number;
}

interface ExerciseState {
  questions: Question[];
  index: number;
  phase: ExercisePhase;
  exam: boolean;
  repeats: number;
  selected: string | null;
  needsGesture: boolean;
  records: Attempt[];
  start: (questions: Question[], exam?: boolean) => void;
  samplesReady: (audioRunning: boolean) => void;
  beginPlaying: () => void;
  beginAnswering: () => void;
  answer: (choice: string) => void;
  repeat: () => void;
  continue: () => void;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  questions: [],
  index: 0,
  phase: "loading",
  exam: false,
  repeats: 0,
  selected: null,
  needsGesture: false,
  records: [],
  start: (questions, exam = false) => {
    const first = questions[0];
    set({
      questions,
      index: 0,
      phase: first ? "loading" : "results",
      exam,
      repeats: 0,
      selected: null,
      needsGesture: false,
      records: [],
    });
  },
  samplesReady: (audioRunning) => {
    const { questions, phase } = get();
    if (phase !== "loading") return;
    const question = questions[0];
    if (!question) {
      set({ phase: "results" });
      return;
    }
    if (question.mode === "audio" && !audioRunning) {
      set({ needsGesture: true });
      return;
    }
    set({ phase: question.mode === "audio" ? "playing" : "answering", needsGesture: false });
  },
  beginPlaying: () => {
    const question = get().questions[get().index];
    if (!question || question.mode !== "audio") return;
    set({ phase: "playing", needsGesture: false });
  },
  beginAnswering: () => {
    if (get().phase === "playing") set({ phase: "answering" });
  },
  answer: (choice) => {
    const { phase, questions, index, repeats, records, exam } = get();
    const question = questions[index];
    if ((phase !== "answering" && phase !== "playing") || !question) return;
    const correctValue = answerValue(question);
    const correct = choice === correctValue;
    const nextRecords = [
      ...records,
      {
        questionId: question.id,
        conceptKey: conceptKey(question.type, correctValue),
        chosenKey: conceptKey(question.type, choice),
        correct,
        repeats,
      },
    ];
    if (!exam) {
      set({ phase: "feedback", selected: choice, records: nextRecords });
      return;
    }
    const next = index + 1;
    if (next >= questions.length) {
      set({ phase: "results", selected: null, records: nextRecords });
      return;
    }
    const following = questions[next]!;
    set({
      index: next,
      selected: null,
      repeats: 0,
      records: nextRecords,
      phase: following.mode === "audio" ? "playing" : "answering",
    });
  },
  repeat: () => {
    const { phase, questions, index } = get();
    const question = questions[index];
    if (!question || question.mode !== "audio" || phase === "playing" || phase === "loading" || phase === "results") {
      return;
    }
    set((state) => ({ phase: "playing", repeats: state.repeats + 1 }));
  },
  continue: () => {
    const { phase, index, questions } = get();
    if (phase !== "feedback") return;
    const next = index + 1;
    if (next >= questions.length) {
      set({ phase: "results", selected: null });
      return;
    }
    const question = questions[next]!;
    set({
      index: next,
      selected: null,
      repeats: 0,
      phase: question.mode === "audio" ? "playing" : "answering",
    });
  },
}));

function answerValue(question: Question): string {
  if (question.type === "interval") return question.interval;
  if (question.type === "chord") return question.quality;
  return question.cadenceId;
}
