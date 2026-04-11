export enum Mark {
  X = 1,
  O = 2,
}

export enum OpCode {
  START = 1, // server → client: game started
  UPDATE = 2, // server → client: board updated
  DONE = 3, // server → client: game over
  MOVE = 4, // client → server: player makes a move
  REJECTED = 5, // server → client: move rejected
  OPPONENT_LEFT = 6, // server → client: opponent disconnected
}

export enum GameMode {
  CLASSIC = 0,
  TIMED = 1,
}

export enum DoneReason {
  WIN = "win",
  DRAW = "draw",
  FORFEIT = "forfeit",
  TIMEOUT = "timeout",
}

// --- Match state (server-only, never sent to client) ---

export interface MatchLabel {
  open: number; // 1 = accepting players, 0 = full/in-progress
  gameMode: GameMode;
}

export interface MatchState {
  board: (Mark | null)[];
  marks: { [userId: string]: Mark };
  presences: { [userId: string]: nkruntime.Presence | null };
  currentTurn: string | null;
  winner: string | null;
  gameOver: boolean;
  gameMode: GameMode;
  turnDeadline: number; // epoch seconds, 0 = no timer
  emptyTicks: number;
  matchLabel: MatchLabel;
  playerCount: number;
}

// --- Messages sent to clients ---

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
  winner: string | null; // null = draw
  winLine: number[] | null; // indices of winning line
  reason: DoneReason;
}

export interface MoveMessage {
  position: number;
}

export interface RejectedMessage {
  reason: string;
}

// --- Player stats stored in Nakama storage ---

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
}
