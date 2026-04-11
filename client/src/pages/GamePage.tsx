import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatch } from "../hooks/useMatch";
import { Board } from "../components/Board";
import { GameStatus } from "../components/GameStatus";
import { PlayerInfo } from "../components/PlayerInfo";
import { Timer } from "../components/Timer";
import { GameMode } from "../nakama/types";

interface GamePageProps {
  userId: string | null;
}

export function GamePage({ userId }: GamePageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get("mode") || "classic") as "classic" | "timed";

  const {
    status,
    board,
    myMark,
    opponentId,
    isMyTurn,
    winner,
    winLine,
    doneReason,
    gameMode,
    deadline,
    error,
    opponentPresent,
    findMatch,
    sendMove,
    leaveMatch,
  } = useMatch(userId);

  // Auto-find match on page load
  useEffect(() => {
    if (status === "idle" && userId) {
      findMatch(mode);
    }
  }, [status, userId, mode, findMatch]);

  const handleCellClick = (index: number) => {
    if (isMyTurn) {
      sendMove(index);
    }
  };

  const handleLeave = async () => {
    await leaveMatch();
    navigate("/");
  };

  const handlePlayAgain = async () => {
    await leaveMatch();
    findMatch(mode);
  };

  return (
    <div className="page game-page">
      <header className="game-page__header">
        <button className="btn btn--small btn--outline" onClick={handleLeave}>
          Leave
        </button>
        <h2 className="game-page__title">
          {mode === "timed" ? "Timed Mode" : "Classic Mode"}
        </h2>
        <div style={{ width: 60 }} />
      </header>

      <PlayerInfo
        myMark={myMark}
        opponentId={opponentId}
        opponentPresent={opponentPresent}
        status={status}
      />

      {gameMode === GameMode.TIMED && (
        <Timer deadline={deadline} active={status === "playing"} />
      )}

      <GameStatus
        status={status}
        isMyTurn={isMyTurn}
        myMark={myMark}
        winner={winner}
        userId={userId}
        doneReason={doneReason}
        error={error}
      />

      <Board
        board={board}
        winLine={winLine}
        disabled={!isMyTurn || status !== "playing"}
        onCellClick={handleCellClick}
      />

      {status === "done" && (
        <div className="game-page__actions">
          <button className="btn btn--primary" onClick={handlePlayAgain}>
            Play Again
          </button>
          <button className="btn btn--outline" onClick={handleLeave}>
            Back to Menu
          </button>
        </div>
      )}

      {(status === "finding" || status === "waiting") && (
        <div className="game-page__waiting">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
