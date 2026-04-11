import { useState, useEffect, useCallback, useRef } from "react";
import { nakamaClient } from "../nakama/client";
import {
  Mark,
  OpCode,
  GameMode,
  DoneReason,
} from "../nakama/types";
import type {
  StartMessage,
  UpdateMessage,
  DoneMessage,
} from "../nakama/types";

export type MatchStatus = "idle" | "finding" | "waiting" | "playing" | "done";

interface MatchState {
  matchId: string | null;
  status: MatchStatus;
  board: (Mark | null)[];
  myMark: Mark | null;
  opponentId: string | null;
  currentTurn: string | null;
  winner: string | null;
  winLine: number[] | null;
  doneReason: DoneReason | null;
  gameMode: GameMode;
  deadline: number;
  error: string | null;
  opponentPresent: boolean;
}

const INITIAL_STATE: MatchState = {
  matchId: null,
  status: "idle",
  board: Array(9).fill(null),
  myMark: null,
  opponentId: null,
  currentTurn: null,
  winner: null,
  winLine: null,
  doneReason: null,
  gameMode: GameMode.CLASSIC,
  deadline: 0,
  error: null,
  opponentPresent: false,
};

export function useMatch(userId: string | null) {
  const [state, setState] = useState<MatchState>(INITIAL_STATE);
  const matchIdRef = useRef<string | null>(null);

  // Register socket event listeners
  useEffect(() => {
    const socket = nakamaClient.getSocket();
    if (!socket) return;

    socket.onmatchdata = (result) => {
      let data = null;
      if (result.data) {
        try {
          // nakama-js v2.8 sends data as Uint8Array — decode to JSON
          const jsonStr =
            result.data instanceof Uint8Array
              ? new TextDecoder().decode(result.data)
              : typeof result.data === "string"
                ? result.data
                : JSON.stringify(result.data);
          data = JSON.parse(jsonStr);
        } catch (e) {
          console.error("[match] failed to decode match data:", e);
        }
      }

      console.log("[match] received opcode:", result.op_code, "data:", data);

      switch (result.op_code) {
        case OpCode.START: {
          const msg = data as StartMessage;
          const myMark = userId ? msg.marks[userId] : null;
          const opponentId = Object.keys(msg.marks).find((id) => id !== userId) || null;
          console.log("[match] GAME STARTED — you:", userId, "opponent:", opponentId);
          console.log("[match] you are:", myMark === Mark.X ? "X" : "O", "| first turn:", msg.currentTurn);
          setState((prev) => ({
            ...prev,
            status: "playing",
            board: msg.board,
            myMark,
            opponentId,
            currentTurn: msg.currentTurn,
            gameMode: msg.gameMode,
            deadline: msg.deadline,
            opponentPresent: true,
          }));
          break;
        }

        case OpCode.UPDATE: {
          const msg = data as UpdateMessage;
          console.log("[match] board updated, turn:", msg.currentTurn);
          setState((prev) => ({
            ...prev,
            board: msg.board,
            currentTurn: msg.currentTurn,
            deadline: msg.deadline,
          }));
          break;
        }

        case OpCode.DONE: {
          const msg = data as DoneMessage;
          console.log("[match] GAME OVER — winner:", msg.winner, "reason:", msg.reason);
          setState((prev) => ({
            ...prev,
            status: "done",
            board: msg.board,
            winner: msg.winner,
            winLine: msg.winLine,
            doneReason: msg.reason,
          }));
          break;
        }

        case OpCode.REJECTED: {
          console.log("[match] move rejected:", data?.reason);
          setState((prev) => ({
            ...prev,
            error: data?.reason || "Move rejected",
          }));
          setTimeout(() => {
            setState((prev) => ({ ...prev, error: null }));
          }, 2000);
          break;
        }

        case OpCode.OPPONENT_LEFT: {
          console.log("[match] opponent disconnected");
          setState((prev) => ({
            ...prev,
            opponentPresent: false,
          }));
          break;
        }
      }
    };

    socket.onmatchpresence = (event) => {
      console.log("[match] presence event — joins:", event.joins, "leaves:", event.leaves);
      if (event.leaves && event.leaves.length > 0) {
        setState((prev) => ({
          ...prev,
          opponentPresent: false,
        }));
      }
      if (event.joins && event.joins.length > 0) {
        setState((prev) => ({
          ...prev,
          opponentPresent: true,
        }));
      }
    };

    return () => {
      socket.onmatchdata = () => {};
      socket.onmatchpresence = () => {};
    };
  }, [userId]);

  const findMatch = useCallback(
    async (mode: "classic" | "timed" = "classic") => {
      setState((prev) => ({ ...prev, status: "finding", error: null }));
      try {
        const matchId = await nakamaClient.findMatch(mode);
        matchIdRef.current = matchId;

        const match = await nakamaClient.joinMatch(matchId);

        console.log("[match] joined, presences:", match.presences);

        // Don't override status if START handler already set it to "playing".
        // joinMatch response only includes OTHER presences (not self),
        // so we always set "waiting" here and let the START handler transition to "playing".
        setState((prev) => ({
          ...prev,
          matchId,
          status: prev.status === "playing" ? "playing" : "waiting",
          board: Array(9).fill(null),
          myMark: null,
          opponentId: null,
          currentTurn: null,
          winner: null,
          winLine: null,
          doneReason: null,
          gameMode: mode === "timed" ? GameMode.TIMED : GameMode.CLASSIC,
          deadline: 0,
          opponentPresent: prev.status === "playing",
        }));
      } catch (err: any) {
        console.error("[match] failed to find/join match:", err);
        setState((prev) => ({
          ...prev,
          status: "idle",
          error: err.message || "Failed to find match",
        }));
      }
    },
    []
  );

  const sendMove = useCallback((position: number) => {
    if (matchIdRef.current) {
      console.log("[match] sending move, position:", position);
      nakamaClient.sendMove(matchIdRef.current, position);
    }
  }, []);

  const leaveMatch = useCallback(async () => {
    if (matchIdRef.current) {
      await nakamaClient.leaveMatch(matchIdRef.current);
      matchIdRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  const isMyTurn = state.currentTurn === userId && state.status === "playing";

  return {
    ...state,
    isMyTurn,
    findMatch,
    sendMove,
    leaveMatch,
  };
}
