import {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLoop,
  matchLeave,
  matchSignal,
  matchTerminate,
} from "./match_handler";
import { rpcFindMatch, rpcHealthcheck } from "./match_rpc";
import { setupLeaderboards } from "./leaderboard";

// Nakama requires a top-level InitModule function.
var InitModule = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  // Register the tic-tac-toe authoritative match handler
  initializer.registerMatch("tic-tac-toe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLoop,
    matchLeave,
    matchSignal,
    matchTerminate,
  });

  // Register RPCs
  initializer.registerRpc("find_match", rpcFindMatch);
  initializer.registerRpc("healthcheck", rpcHealthcheck);

  // Create leaderboards
  setupLeaderboards(nk, logger);

  logger.info("tic-tac-toe server module loaded");
};
