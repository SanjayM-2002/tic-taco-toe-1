import {
  TICK_RATE,
  BOARD_SIZE,
  MAX_PLAYERS,
  TURN_TIMEOUT_SEC,
  MAX_EMPTY_TICKS,
  WIN_LINES,
} from "./constants";
import {
  Mark,
  OpCode,
  GameMode,
  DoneReason,
  MatchState,
  MatchLabel,
  StartMessage,
  UpdateMessage,
  DoneMessage,
  MoveMessage,
  RejectedMessage,
} from "./messages";
import { submitGameResult, submitDrawResult } from "./leaderboard";

// ─── Helpers ──────────────────────────────────────────────

function getActivePresences(state: MatchState): nkruntime.Presence[] {
  const presences: nkruntime.Presence[] = [];
  for (const userId in state.presences) {
    const p = state.presences[userId];
    if (p !== null) {
      presences.push(p);
    }
  }
  return presences;
}

function checkWin(board: (Mark | null)[]): { winner: Mark; line: number[] } | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== null && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a]!, line };
    }
  }
  return null;
}

function checkDraw(board: (Mark | null)[]): boolean {
  return board.every((cell) => cell !== null);
}

function getUserIdByMark(state: MatchState, mark: Mark): string | null {
  for (const userId in state.marks) {
    if (state.marks[userId] === mark) {
      return userId;
    }
  }
  return null;
}

function getOpponentId(state: MatchState, userId: string): string | null {
  for (const id in state.marks) {
    if (id !== userId) {
      return id;
    }
  }
  return null;
}

function calculateDeadline(state: MatchState): number {
  if (state.gameMode === GameMode.TIMED) {
    return Math.floor(Date.now() / 1000) + TURN_TIMEOUT_SEC;
  }
  return 0;
}

// matchInit

export const matchInit: nkruntime.MatchInitFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  params
) {
  const gameMode =
    params && params["gameMode"] === "timed" ? GameMode.TIMED : GameMode.CLASSIC;

  const label: MatchLabel = {
    open: 1,
    gameMode,
  };

  const state: MatchState = {
    board: new Array(BOARD_SIZE).fill(null),
    marks: {},
    presences: {},
    currentTurn: null,
    winner: null,
    gameOver: false,
    gameMode,
    turnDeadline: 0,
    emptyTicks: 0,
    matchLabel: label,
    playerCount: 0,
  };

  logger.info("match created, mode: %s", gameMode === GameMode.TIMED ? "timed" : "classic");

  return {
    state,
    tickRate: TICK_RATE,
    label: JSON.stringify(label),
  };
};

// matchJoinAttempt

export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presence,
  metadata
) {
  if (state.gameOver) {
    return { state, accept: false, rejectMessage: "game is already over" };
  }

  if (state.playerCount >= MAX_PLAYERS) {
    return { state, accept: false, rejectMessage: "match is full" };
  }

  // Reject if player is already in the match
  if (state.presences[presence.userId] !== undefined && state.presences[presence.userId] !== null) {
    return { state, accept: false, rejectMessage: "already joined" };
  }

  logger.info("player %s attempting to join", presence.userId);
  return { state, accept: true };
};

// matchJoin

export const matchJoin: nkruntime.MatchJoinFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences
) {
  for (const presence of presences) {
    state.presences[presence.userId] = presence;
    state.playerCount++;

    // Assign marks: first player = X, second player = O
    if (Object.keys(state.marks).length === 0) {
      state.marks[presence.userId] = Mark.X;
      logger.info("player %s joined as X", presence.userId);
    } else if (Object.keys(state.marks).length === 1) {
      state.marks[presence.userId] = Mark.O;
      logger.info("player %s joined as O", presence.userId);
    }
  }

  // If we have 2 players, start the game
  if (state.playerCount === MAX_PLAYERS) {
    // Close the match to new players
    state.matchLabel.open = 0;
    dispatcher.matchLabelUpdate(JSON.stringify(state.matchLabel));

    // X goes first
    const xPlayer = getUserIdByMark(state, Mark.X)!;
    state.currentTurn = xPlayer;
    state.turnDeadline = calculateDeadline(state);

    const startMsg: StartMessage = {
      board: state.board,
      marks: state.marks,
      currentTurn: state.currentTurn,
      deadline: state.turnDeadline,
      gameMode: state.gameMode,
    };

    dispatcher.broadcastMessage(OpCode.START, JSON.stringify(startMsg));

    const playerIds = Object.keys(state.marks);
    logger.info("GAME STARTED — %s (X) vs %s (O) | match: %s", playerIds[0], playerIds[1], ctx.matchId);
  }

  return { state };
};

// matchLoop 

export const matchLoop: nkruntime.MatchLoopFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  messages
) {
  //  Idle match cleanup 
  const activePresences = getActivePresences(state);
  if (activePresences.length === 0) {
    state.emptyTicks++;
    if (state.emptyTicks > MAX_EMPTY_TICKS) {
      logger.info("match idle for too long, terminating");
      return null;
    }
    return { state };
  }
  state.emptyTicks = 0;

  //  Turn timer check (timed mode) 
  if (
    !state.gameOver &&
    state.gameMode === GameMode.TIMED &&
    state.currentTurn !== null &&
    state.turnDeadline > 0
  ) {
    const now = Math.floor(Date.now() / 1000);
    if (now > state.turnDeadline) {
      // Current player ran out of time — they lose
      const loserId = state.currentTurn;
      const winnerId = getOpponentId(state, loserId)!;

      state.gameOver = true;
      state.winner = winnerId;

      const doneMsg: DoneMessage = {
        board: state.board,
        winner: winnerId,
        winLine: null,
        reason: DoneReason.TIMEOUT,
      };

      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(doneMsg));
      submitGameResult(nk, logger, winnerId, loserId);
      logger.info("player %s timed out, %s wins", loserId, winnerId);

      return { state };
    }
  }

  // Process incoming messages
  if (state.gameOver) {
    return { state };
  }

  for (const message of messages) {
    if (message.opCode !== OpCode.MOVE) {
      continue;
    }

    const senderId = message.sender.userId;

    // Parse move
    let moveData: MoveMessage;
    try {
      moveData = JSON.parse(nk.binaryToString(message.data));
    } catch (e) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: "invalid message format" } as RejectedMessage),
        [message.sender]
      );
      continue;
    }

    const position = moveData.position;

    // Validate: is it this player's turn?
    if (senderId !== state.currentTurn) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: "not your turn" } as RejectedMessage),
        [message.sender]
      );
      continue;
    }

    // Validate: is position in range?
    if (position < 0 || position >= BOARD_SIZE) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: "invalid position" } as RejectedMessage),
        [message.sender]
      );
      continue;
    }

    // Validate: is the cell empty?
    if (state.board[position] !== null) {
      dispatcher.broadcastMessage(
        OpCode.REJECTED,
        JSON.stringify({ reason: "cell already occupied" } as RejectedMessage),
        [message.sender]
      );
      continue;
    }

    //  Apply the move 
    const mark = state.marks[senderId];
    state.board[position] = mark;

    // Check for a win
    const winResult = checkWin(state.board);
    if (winResult) {
      state.gameOver = true;
      state.winner = senderId;

      const loserId = getOpponentId(state, senderId);
      const doneMsg: DoneMessage = {
        board: state.board,
        winner: senderId,
        winLine: winResult.line,
        reason: DoneReason.WIN,
      };

      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(doneMsg));
      if (loserId) {
        submitGameResult(nk, logger, senderId, loserId);
      }
      logger.info("player %s wins!", senderId);
      return { state };
    }

    // Check for a draw
    if (checkDraw(state.board)) {
      state.gameOver = true;

      const doneMsg: DoneMessage = {
        board: state.board,
        winner: null,
        winLine: null,
        reason: DoneReason.DRAW,
      };

      dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(doneMsg));
      submitDrawResult(nk, logger, Object.keys(state.marks));
      logger.info("game ended in a draw");
      return { state };
    }

    // Switch turn
    state.currentTurn = getOpponentId(state, senderId)!;
    state.turnDeadline = calculateDeadline(state);

    const updateMsg: UpdateMessage = {
      board: state.board,
      currentTurn: state.currentTurn,
      deadline: state.turnDeadline,
    };

    dispatcher.broadcastMessage(OpCode.UPDATE, JSON.stringify(updateMsg));
  }

  return { state };
};

//  matchLeave

export const matchLeave: nkruntime.MatchLeaveFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  presences
) {
  for (const presence of presences) {
    logger.info("player %s left", presence.userId);
    state.presences[presence.userId] = null;
    state.playerCount--;
  }

  // If game was in progress and a player left, the remaining player wins by forfeit
  if (!state.gameOver && state.playerCount === 1 && Object.keys(state.marks).length === MAX_PLAYERS) {
    state.gameOver = true;

    const remainingPresences = getActivePresences(state);
    if (remainingPresences.length === 1) {
      const winnerId = remainingPresences[0].userId;
      const loserId = getOpponentId(state, winnerId)!;
      state.winner = winnerId;

      const doneMsg: DoneMessage = {
        board: state.board,
        winner: winnerId,
        winLine: null,
        reason: DoneReason.FORFEIT,
      };

      dispatcher.broadcastMessage(
        OpCode.DONE,
        JSON.stringify(doneMsg),
        remainingPresences
      );
      submitGameResult(nk, logger, winnerId, loserId);
      logger.info("player %s wins by forfeit", winnerId);
    }
  }

  return { state };
};

//  matchSignal

export const matchSignal: nkruntime.MatchSignalFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  data
) {
  logger.info("match signal received: %s", data);
  return { state, data: "signal acknowledged" };
};

//  matchTerminate

export const matchTerminate: nkruntime.MatchTerminateFunction<MatchState> = function (
  ctx,
  logger,
  nk,
  dispatcher,
  tick,
  state,
  graceSeconds
) {
  logger.info("match terminating, grace period: %d seconds", graceSeconds);

  // Notify connected players that the match is being terminated
  const doneMsg: DoneMessage = {
    board: state.board,
    winner: null,
    winLine: null,
    reason: DoneReason.FORFEIT,
  };

  dispatcher.broadcastMessage(OpCode.DONE, JSON.stringify(doneMsg));

  return { state };
};

