import { useNavigate } from "react-router-dom";

interface HomePageProps {
  authenticated: boolean;
  loading: boolean;
  userId: string | null;
}

export function HomePage({ authenticated, loading, userId }: HomePageProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="page page--center">
        <div className="spinner" />
        <p>Connecting to server...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="page page--center">
        <p className="error">Failed to connect. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="page page--center">
      <h1 className="title">Tic Tac Toe</h1>
      <p className="subtitle">Multiplayer</p>

      <div className="menu">
        <button
          className="btn btn--primary"
          onClick={() => navigate("/game?mode=classic")}
        >
          Play Classic
        </button>
        <button
          className="btn btn--secondary"
          onClick={() => navigate("/game?mode=timed")}
        >
          Play Timed (30s turns)
        </button>
        <button
          className="btn btn--outline"
          onClick={() => navigate("/leaderboard")}
        >
          Leaderboard
        </button>
      </div>

      <p className="user-id">
        Playing as: {userId?.slice(0, 8)}...
      </p>
    </div>
  );
}
