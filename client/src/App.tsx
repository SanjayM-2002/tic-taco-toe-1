import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useNakama } from "./hooks/useNakama";
import { HomePage } from "./pages/HomePage";
import { GamePage } from "./pages/GamePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import "./App.css";

function App() {
  const { authenticated, userId, loading } = useNakama();

  return (
    <BrowserRouter>
      <div className="app">
        {userId && (
          <div className="device-id-bar">
            Device ID: {userId}
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                authenticated={authenticated}
                loading={loading}
                userId={userId}
              />
            }
          />
          <Route path="/game" element={<GamePage userId={userId} />} />
          <Route
            path="/leaderboard"
            element={<LeaderboardPage userId={userId} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
