
export const Mark = {
  X: 1,
  O: 2,
} as const;
export type Mark = (typeof Mark)[keyof typeof Mark];

export const OpCode = {
  START: 1,
  UPDATE: 2,
  DONE: 3,
  MOVE: 4,
  REJECTED: 5,
  OPPONENT_LEFT: 6,
} as const;
export type OpCode = (typeof OpCode)[keyof typeof OpCode];

export const GameMode = {
  CLASSIC: 0,
  TIMED: 1,
} as const;
export type GameMode = (typeof GameMode)[keyof typeof GameMode];

export const DoneReason = {
  WIN: "win",
  DRAW: "draw",
  FORFEIT: "forfeit",
  TIMEOUT: "timeout",
} as const;
export type DoneReason = (typeof DoneReason)[keyof typeof DoneReason];

export interface StartMessage {
  board: (Mark | null)[];
  marks: { [userId: string]: Mark };
  currentTurn: string;
  deadline: number;
  gameMode: GameMode;
}

export interface UpdateMessage {
  board: (Mark | null)[];
  currentTurn: string;
  deadline: number;
}

export interface DoneMessage {
  board: (Mark | null)[];
  winner: string | null;
  winLine: number[] | null;
  reason: DoneReason;
}

export interface MoveMessage {
  position: number;
}

export interface RejectedMessage {
  reason: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
}
