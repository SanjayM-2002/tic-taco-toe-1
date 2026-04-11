import { Client, Session } from "@heroiclabs/nakama-js";
import type { Socket } from "@heroiclabs/nakama-js";

const NAKAMA_SERVER_KEY = "defaultkey";
const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || "127.0.0.1";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_USE_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";

class NakamaClient {
  private client: Client;
  private session: Session | null = null;
  private socket: Socket | null = null;

  constructor() {
    this.client = new Client(
      NAKAMA_SERVER_KEY,
      NAKAMA_HOST,
      NAKAMA_PORT,
      NAKAMA_USE_SSL
    );
  }

  getClient(): Client {
    return this.client;
  }

  getSession(): Session | null {
    return this.session;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  async authenticate(): Promise<Session> {
    let deviceId = sessionStorage.getItem("nakama_device_id");
    if (!deviceId) {
      deviceId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
      );
      sessionStorage.setItem("nakama_device_id", deviceId);
    }

    console.log("[nakama] authenticating with device:", deviceId);
    this.session = await this.client.authenticateDevice(deviceId, true);
    console.log("[nakama] authenticated, userId:", this.session.user_id);

    await this.connectSocket();
    return this.session;
  }

  private async connectSocket(): Promise<void> {
    if (this.socket) return;

    this.socket = this.client.createSocket(NAKAMA_USE_SSL);
    await this.socket.connect(this.session!, true);
    console.log("[nakama] socket connected");
  }

  async findMatch(mode: "classic" | "timed" = "classic"): Promise<string> {
    if (!this.session) throw new Error("Not authenticated");

    console.log("[nakama] finding match, mode:", mode);
    const response = await this.client.rpc(this.session, "find_match", {
      mode,
    });
    const data = response.payload as { matchIds: string[] };
    console.log("[nakama] found match:", data.matchIds[0]);
    return data.matchIds[0];
  }

  async joinMatch(matchId: string) {
    if (!this.socket) throw new Error("Socket not connected");
    console.log("[nakama] joining match:", matchId);
    const result = await this.socket.joinMatch(matchId);
    console.log("[nakama] joined match, presences:", result.presences);
    return result;
  }

  sendMove(matchId: string, position: number): void {
    if (!this.socket) throw new Error("Socket not connected");
    const data = new TextEncoder().encode(JSON.stringify({ position }));
    this.socket.sendMatchState(matchId, 4, data);
  }

  async leaveMatch(matchId: string): Promise<void> {
    if (!this.socket) return;
    await this.socket.leaveMatch(matchId);
  }

  async getLeaderboard(
    leaderboardId: string,
    limit: number = 20
  ) {
    if (!this.session) throw new Error("Not authenticated");
    return await this.client.listLeaderboardRecords(
      this.session,
      leaderboardId,
      undefined,
      limit
    );
  }

  async getPlayerStats(userId: string): Promise<any> {
    if (!this.session) throw new Error("Not authenticated");
    const result = await this.client.readStorageObjects(this.session, {
      object_ids: [
        {
          collection: "player_stats",
          key: "stats",
          user_id: userId,
        },
      ],
    });
    if (result.objects && result.objects.length > 0) {
      return result.objects[0].value;
    }
    return { wins: 0, losses: 0, draws: 0, currentStreak: 0, bestStreak: 0 };
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect(true);
      this.socket = null;
    }
  }
}

export const nakamaClient = new NakamaClient();
