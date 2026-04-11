import { GameMode } from "./messages";

const MATCH_MODULE = "tic-tac-toe";

export const rpcFindMatch: nkruntime.RpcFunction = function (
  ctx,
  logger,
  nk,
  payload
): string {
  logger.info("find_match called by user: %s, payload: %s", ctx.userId, payload);

  // Parse request payload
  let gameMode = GameMode.CLASSIC;
  if (payload) {
    try {
      const data = JSON.parse(payload);
      if (data.mode === "timed") {
        gameMode = GameMode.TIMED;
      }
    } catch (e) {
      logger.warn("failed to parse payload: %s", payload);
    }
  }

  // Search for an open match with the requested game mode
  const query = "+label.open:1 +label.gameMode:" + gameMode;
  logger.info("searching matches with query: %s", query);

  const matches = nk.matchList(10, true, null, null, null, query);
  logger.info("matchList returned %d matches", matches.length);

  for (let i = 0; i < matches.length; i++) {
    logger.info("  match[%d]: id=%s size=%d label=%s", i, matches[i].matchId, matches[i].size, matches[i].label);
  }

  // Find a match that isn't full (size < 2)
  for (const match of matches) {
    if (match.size < 2) {
      logger.info("joining existing match: %s (size=%d)", match.matchId, match.size);
      return JSON.stringify({ matchIds: [match.matchId] });
    }
  }

  // No open match found — create a new one
  const matchId = nk.matchCreate(MATCH_MODULE, {
    gameMode: gameMode === GameMode.TIMED ? "timed" : "classic",
  });

  logger.info("created new match: %s for user: %s", matchId, ctx.userId);
  return JSON.stringify({ matchIds: [matchId] });
};

export const rpcHealthcheck: nkruntime.RpcFunction = function (
  ctx,
  logger,
  nk,
  payload
): string {
  logger.info("healthcheck called");
  return JSON.stringify({ status: "ok" });
};
