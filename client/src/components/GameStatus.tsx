import { Mark, DoneReason } from "../nakama/types";
import type { MatchStatus } from "../hooks/useMatch";

interface GameStatusProps {
  status: MatchStatus;
  isMyTurn: boolean;
  myMark: Mark | null;
  winner: string | null;
  userId: string | null;
  doneReason: DoneReason | null;
  error: string | null;
}

export function GameStatus({
  status,
  isMyTurn,
  myMark,
  winner,
  userId,
  doneReason,
  error,
}: GameStatusProps) {
  const getStatusText = (): string => {
    switch (status) {
      case "finding":
        return "Finding a match...";
      case "waiting":
        return "Waiting for opponent...";
      case "playing":
        return isMyTurn ? "Your turn!" : "Opponent's turn...";
      case "done": {
        if (doneReason === DoneReason.DRAW) return "It's a draw!";
        if (winner === userId) {
          if (doneReason === DoneReason.FORFEIT) return "You win! Opponent left.";
          if (doneReason === DoneReason.TIMEOUT) return "You win! Opponent timed out.";
          return "You win!";
        }
        if (doneReason === DoneReason.FORFEIT) return "You left the game.";
        if (doneReason === DoneReason.TIMEOUT) return "Time's up! You lose.";
        return "You lose!";
      }
      default:
        return "";
    }
  };

  const getStatusClass = (): string => {
    if (status === "done") {
      if (doneReason === DoneReason.DRAW) return "status--draw";
      if (winner === userId) return "status--win";
      return "status--lose";
    }
    if (status === "playing" && isMyTurn) return "status--my-turn";
    return "";
  };

  return (
    <div className={`game-status ${getStatusClass()}`}>
      <p className="game-status__text">{getStatusText()}</p>
      {myMark && status !== "idle" && (
        <p className="game-status__mark">
          You are <span className={myMark === Mark.X ? "mark--x" : "mark--o"}>
            {myMark === Mark.X ? "X" : "O"}
          </span>
        </p>
      )}
      {error && <p className="game-status__error">{error}</p>}
    </div>
  );
}
