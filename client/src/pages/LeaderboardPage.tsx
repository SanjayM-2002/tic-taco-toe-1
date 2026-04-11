import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLeaderboard } from "../hooks/useLeaderboard";
import type { PlayerStats } from "../nakama/types";

interface LeaderboardPageProps {
  userId: string | null;
}

export function LeaderboardPage({ userId }: LeaderboardPageProps) {
  const navigate = useNavigate();
  const { records, loading, error, fetchLeaderboard, fetchPlayerStats } = useLeaderboard();
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  const [activeTab, setActiveTab] = useState<"wins" | "win_streak">("wins");

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab, fetchLeaderboard]);

  useEffect(() => {
    if (userId) {
      fetchPlayerStats(userId).then(setMyStats);
    }
  }, [userId, fetchPlayerStats]);

  return (
    <div className="page leaderboard-page">
      <header className="leaderboard-page__header">
        <button className="btn btn--small btn--outline" onClick={() => navigate("/")}>
          Back
        </button>
        <h2>Leaderboard</h2>
        <div style={{ width: 60 }} />
      </header>

      {myStats && (
        <div className="my-stats">
          <h3>Your Stats</h3>
          <div className="my-stats__grid">
            <div className="my-stats__item">
              <span className="my-stats__value">{myStats.wins}</span>
              <span className="my-stats__label">Wins</span>
            </div>
            <div className="my-stats__item">
              <span className="my-stats__value">{myStats.losses}</span>
              <span className="my-stats__label">Losses</span>
            </div>
            <div className="my-stats__item">
              <span className="my-stats__value">{myStats.draws}</span>
              <span className="my-stats__label">Draws</span>
            </div>
            <div className="my-stats__item">
              <span className="my-stats__value">{myStats.bestStreak}</span>
              <span className="my-stats__label">Best Streak</span>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "wins" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("wins")}
        >
          Most Wins
        </button>
        <button
          className={`tab ${activeTab === "win_streak" ? "tab--active" : ""}`}
          onClick={() => setActiveTab("win_streak")}
        >
          Best Streak
        </button>
      </div>

      {loading && (
        <div className="page--center">
          <div className="spinner" />
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="leaderboard-table">
          <div className="leaderboard-table__header">
            <span className="leaderboard-table__rank">#</span>
            <span className="leaderboard-table__name">Player</span>
            <span className="leaderboard-table__score">
              {activeTab === "wins" ? "Wins" : "Streak"}
            </span>
          </div>
          {records.length === 0 && (
            <p className="leaderboard-table__empty">No records yet. Play a game!</p>
          )}
          {records.map((record) => (
            <div
              key={record.ownerId}
              className={`leaderboard-table__row ${
                record.ownerId === userId ? "leaderboard-table__row--me" : ""
              }`}
            >
              <span className="leaderboard-table__rank">{record.rank}</span>
              <span className="leaderboard-table__name">{record.username}</span>
              <span className="leaderboard-table__score">{record.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
