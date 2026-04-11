import {
  LEADERBOARD_ID,
  LEADERBOARD_STREAK_ID,
  PLAYER_STATS_COLLECTION,
  PLAYER_STATS_KEY,
} from "./constants";
import { PlayerStats } from "./messages";

// Called from InitModule to create leaderboards if they don't exist
export function setupLeaderboards(nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
  // Wins leaderboard — descending, best score wins
  nk.leaderboardCreate(
    LEADERBOARD_ID,
    true,
    nkruntime.SortOrder.DESCENDING,
    nkruntime.Operator.INCREMENTAL,
    undefined,
    undefined
  );
  logger.info("leaderboard '%s' ready", LEADERBOARD_ID);

  nk.leaderboardCreate(
    LEADERBOARD_STREAK_ID,
    true,
    nkruntime.SortOrder.DESCENDING,
    nkruntime.Operator.BEST,
    undefined,
    undefined
  );
  logger.info("leaderboard '%s' ready", LEADERBOARD_STREAK_ID);
}

// Called when a game ends with a winner
export function submitGameResult(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  winnerId: string,
  loserId: string
): void {
  try {
    // Update wins leaderboard
    nk.leaderboardRecordWrite(LEADERBOARD_ID, winnerId, undefined, 1);

    // Update winner stats
    const winnerStats = readPlayerStats(nk, winnerId);
    winnerStats.wins++;
    winnerStats.currentStreak++;
    if (winnerStats.currentStreak > winnerStats.bestStreak) {
      winnerStats.bestStreak = winnerStats.currentStreak;
    }
    writePlayerStats(nk, winnerId, winnerStats);

    // Update win streak leaderboard with current streak
    nk.leaderboardRecordWrite(LEADERBOARD_STREAK_ID, winnerId, undefined, winnerStats.bestStreak);

    // Update loser stats
    const loserStats = readPlayerStats(nk, loserId);
    loserStats.losses++;
    loserStats.currentStreak = 0;
    writePlayerStats(nk, loserId, loserStats);

    logger.info("game result recorded: winner=%s loser=%s", winnerId, loserId);
  } catch (e) {
    logger.error("failed to submit game result: %s", e);
  }
}

// Called when a game ends in a draw
export function submitDrawResult(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  playerIds: string[]
): void {
  for (const userId of playerIds) {
    try {
      const stats = readPlayerStats(nk, userId);
      stats.draws++;
      stats.currentStreak = 0;
      writePlayerStats(nk, userId, stats);
    } catch (e) {
      logger.error("failed to write draw stats for %s: %s", userId, e);
    }
  }
}

// --- Storage helpers ---

function readPlayerStats(nk: nkruntime.Nakama, userId: string): PlayerStats {
  const result = nk.storageRead([
    {
      collection: PLAYER_STATS_COLLECTION,
      key: PLAYER_STATS_KEY,
      userId,
    },
  ]);

  if (result.length > 0 && result[0].value) {
    return result[0].value as PlayerStats;
  }

  return { wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
}

function writePlayerStats(nk: nkruntime.Nakama, userId: string, stats: PlayerStats): void {
  nk.storageWrite([
    {
      collection: PLAYER_STATS_COLLECTION,
      key: PLAYER_STATS_KEY,
      userId,
      value: stats,
      permissionRead: 2, // public read
      permissionWrite: 0, // server-only write
    },
  ]);
}
