export const TICK_RATE = 5; // match loop runs 5 times per second
export const BOARD_SIZE = 9; // 3x3 grid
export const MAX_PLAYERS = 2;
export const TURN_TIMEOUT_SEC = 30; // seconds per turn in timed mode
export const MAX_EMPTY_TICKS = 500; // ~100 seconds of no players before cleanup
export const LEADERBOARD_ID = "wins";
export const LEADERBOARD_STREAK_ID = "win_streak";
export const PLAYER_STATS_COLLECTION = "player_stats";
export const PLAYER_STATS_KEY = "stats";

// Win conditions
export const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
