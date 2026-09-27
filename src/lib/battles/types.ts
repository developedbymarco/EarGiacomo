export interface BattleStimulus {
  type: "interval" | "chord" | "cadence";
  mode: "audio" | "staff" | "piano";
  notes: number[];
  playback: number[][];
  spelled?: string[];
  spelledChords?: string[][];
  answerChoices: string[];
  pianoInstrumentId: string;
  hint: string;
}

export interface BattleCard {
  id: string;
  status: string;
  preset: string;
  stake: number;
  questionCount: number;
  username: string;
  displayName: string | null;
  yourScore: number;
  theirScore: number;
  winner: "you" | "them" | "draw" | null;
}

export interface BattleLists {
  incoming: BattleCard[];
  outgoing: BattleCard[];
  active: BattleCard[];
  recent: BattleCard[];
}

export interface BattleView {
  id: string;
  status: string;
  preset: string;
  stake: number;
  questionCount: number;
  youAre: "challenger" | "opponent";
  you: { username: string; displayName: string | null; score: number; answered: number; correct: number };
  them: { username: string; displayName: string | null; score: number; answered: number; correct: number };
  winner: "you" | "them" | "draw" | null;
  refunded: boolean;
  yourXp: number;
  question: BattleStimulus | null;
  questionIndex: number | null;
}

export interface BattleSubmit {
  correct: boolean;
  correctAnswer: string;
  spelled: string[];
  awarded: number;
  yourScore: number;
  theirScore: number;
  yourAnswered: number;
  theirAnswered: number;
  questionCount: number;
  status: string;
  winner: "you" | "them" | "draw" | null;
  refunded: boolean;
}

export interface BattleRecord {
  visible: boolean;
  wins: number;
  losses: number;
  draws: number;
  played: number;
}
