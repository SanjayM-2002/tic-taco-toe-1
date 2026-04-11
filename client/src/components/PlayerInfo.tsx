import { Mark } from "../nakama/types";

interface PlayerInfoProps {
  myMark: Mark | null;
  opponentId: string | null;
  opponentPresent: boolean;
  status: string;
}

export function PlayerInfo({ myMark, opponentId, opponentPresent, status }: PlayerInfoProps) {
  if (status === "idle" || status === "finding") return null;

  return (
    <div className="player-info">
      <div className="player-info__player">
        <span className={`player-info__mark ${myMark === Mark.X ? "mark--x" : "mark--o"}`}>
          {myMark === Mark.X ? "X" : "O"}
        </span>
        <span className="player-info__name">You</span>
        <span className="player-info__dot player-info__dot--online" />
      </div>
      <span className="player-info__vs">VS</span>
      <div className="player-info__player">
        <span className={`player-info__mark ${myMark === Mark.X ? "mark--o" : "mark--x"}`}>
          {myMark === Mark.X ? "O" : "X"}
        </span>
        <span className="player-info__name">
          {opponentId ? opponentId.slice(0, 8) + "..." : "Waiting..."}
        </span>
        <span
          className={`player-info__dot ${
            opponentPresent ? "player-info__dot--online" : "player-info__dot--offline"
          }`}
        />
      </div>
    </div>
  );
}
