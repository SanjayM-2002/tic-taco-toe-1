import { useState, useEffect, useCallback } from "react";
import { nakamaClient } from "../nakama/client";

interface NakamaState {
  authenticated: boolean;
  userId: string | null;
  username: string | null;
  loading: boolean;
  error: string | null;
}

export function useNakama() {
  const [state, setState] = useState<NakamaState>({
    authenticated: false,
    userId: null,
    username: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    nakamaClient
      .authenticate()
      .then((session) => {
        console.log("[nakama] authenticated successfully, userId:", session.user_id, "username:", session.username);
        if (mounted) {
          setState({
            authenticated: true,
            userId: session.user_id ?? null,
            username: session.username ?? null,
            loading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        console.error("[nakama] authentication failed:", err);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.message || "Failed to connect",
          }));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const disconnect = useCallback(() => {
    nakamaClient.disconnect();
    setState({
      authenticated: false,
      userId: null,
      username: null,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, disconnect };
}
