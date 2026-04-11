import { useState, useCallback } from "react";
import { nakamaClient } from "../nakama/client";
import type { PlayerStats } from "../nakama/types";

interface LeaderboardRecord {
  ownerId: string;
  username: string;
  score: number;
  rank: number;
}

interface LeaderboardState {
  records: LeaderboardRecord[];
  loading: boolean;
  error: string | null;
}

export function useLeaderboard() {
  const [state, setState] = useState<LeaderboardState>({
    records: [],
    loading: false,
    error: null,
  });

  const fetchLeaderboard = useCallback(
    async (leaderboardId: string = "wins", limit: number = 20) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await nakamaClient.getLeaderboard(leaderboardId, limit);
        const records: LeaderboardRecord[] = (result.records || []).map(
          (r: any, index: number) => ({
            ownerId: r.owner_id,
            username: r.username?.value || `Player-${r.owner_id.slice(0, 6)}`,
            score: Number(r.score),
            rank: Number(r.rank) || index + 1,
          })
        );
        setState({ records, loading: false, error: null });
      } catch (err: any) {
        setState({
          records: [],
          loading: false,
          error: err.message || "Failed to load leaderboard",
        });
      }
    },
    []
  );

  const fetchPlayerStats = useCallback(
    async (userId: string): Promise<PlayerStats> => {
      return await nakamaClient.getPlayerStats(userId);
    },
    []
  );

  return { ...state, fetchLeaderboard, fetchPlayerStats };
}
