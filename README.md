# Multiplayer Tic-Tac-Toe

A real-time multiplayer Tic-Tac-Toe game with server-authoritative architecture using **Nakama** (game server) and **React** (web client).

---

## Architecture and Design Decisions

### High-Level Architecture

```
React Client (Browser)          Nakama Server (Docker)          Cloud PostgreSQL
┌──────────────────┐           ┌──────────────────────┐        ┌──────────────┐
│  Vite + React    │  HTTP     │  TypeScript Runtime   │        │  Neon / RDS  │
│  @heroiclabs/    │──────────▶│  - Match Handlers     │───────▶│  - Users     │
│   nakama-js SDK  │ WebSocket │  - RPCs               │        │  - Leaderboard│
│                  │◀──────────│  - Leaderboard        │◀───────│  - Storage   │
└──────────────────┘           └──────────────────────┘        └──────────────┘
```

### Server-Authoritative Design

All game logic runs on the Nakama server. The client is a display layer that sends player actions and renders server-validated state.

- **Game state** (board, turns, marks) lives in server memory during a match
- **Every move** is validated server-side before being applied (correct turn, valid position, cell empty)
- **Clients cannot manipulate** board state — they only send `{ position: N }` and receive the full validated board back
- **Win/draw detection** is computed server-side only

### Match Lifecycle

1. **matchInit** — Creates empty board, sets tick rate (5/sec)
2. **matchJoinAttempt** — Validates player count (max 2)
3. **matchJoin** — Assigns marks (X to first, O to second), broadcasts START when full
4. **matchLoop** — Processes moves, validates, checks win/draw, broadcasts updates, enforces turn timer
5. **matchLeave** — Handles disconnection, awards forfeit win
6. **matchTerminate** — Cleanup on server shutdown

### Matchmaking

- Client calls `find_match` RPC → server searches for open matches via label query
- If found, returns existing match ID; otherwise creates a new match
- Match labels (`{ open: 1, gameMode: 0 }`) enable filtering by availability and mode

### Communication Protocol

| Direction | OpCode | Payload |
|---|---|---|
| Client → Server | MOVE (4) | `{ position: 0-8 }` |
| Server → Client | START (1) | `{ board, marks, currentTurn, deadline, gameMode }` |
| Server → Client | UPDATE (2) | `{ board, currentTurn, deadline }` |
| Server → Client | DONE (3) | `{ board, winner, winLine, reason }` |
| Server → Client | REJECTED (5) | `{ reason }` |

### Tech Stack

| Layer | Technology |
|---|---|
| Game Server | Nakama 3.25.0 (Docker) |
| Server Logic | TypeScript → bundled to ES5 via Rollup |
| Database | PostgreSQL (cloud-hosted) |
| Frontend | React + TypeScript + Vite |
| Client SDK | @heroiclabs/nakama-js v2.8.0 |
| Deployment | GCP Compute Engine + Nginx |

---

## API / Server Configuration

### Nakama Ports

| Port | Protocol | Purpose |
|---|---|---|
| 7350 | HTTP + WebSocket | Client API (authentication, RPCs, realtime) |
| 7351 | HTTP | Admin Console (dashboard) |
| 7349 | gRPC | Internal API |

### Registered RPCs

| RPC ID | Description |
|---|---|
| `find_match` | Find an open match or create a new one. Accepts `{ mode: "classic" \| "timed" }` |
| `healthcheck` | Returns `{ status: "ok" }` for uptime monitoring |

### Health Check

```
GET http://<server-ip>:7350/healthcheck
```

Returns `200 OK` — no authentication required. Use this for load balancer health probes.

### Leaderboards

| ID | Sort | Operator | Description |
|---|---|---|---|
| `wins` | Descending | Incremental | Total wins per player |
| `win_streak` | Descending | Best | Highest consecutive win streak |

### Player Stats (Storage)

Collection: `player_stats`, Key: `stats`

```json
{ "wins": 0, "losses": 0, "draws": 0, "currentStreak": 0, "bestStreak": 0 }
```

### Environment Variables

**Server (`nakama/.env`)**

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port (default: 5432) |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_SSL_MODE` | SSL mode (e.g. `require`) |

**Client (`client/.env`)**

| Variable | Description |
|---|---|
| `VITE_NAKAMA_HOST` | Nakama server IP/hostname |
| `VITE_NAKAMA_PORT` | Nakama API port (default: 7350) |
| `VITE_NAKAMA_USE_SSL` | `true` for wss://, `false` for ws:// |

---

## Setup and Installation

### Prerequisites

- Node.js v20+
- Docker & Docker Compose
- npm
- A PostgreSQL database (cloud-hosted — e.g. Neon, AWS RDS, GCP Cloud SQL, Supabase)

### Server (Nakama)

```bash
cd nakama

# Install dependencies
npm install

# Build TypeScript module
npm run build

# Configure database — copy .env.example to .env and fill in credentials
cp .env.example .env

# Start Nakama
docker-compose up -d
```

Nakama auto-creates all database tables on first run via `migrate up`.

Verify:
- Admin Console: `http://localhost:7351` (admin / password)
- Health Check: `curl http://localhost:7350/healthcheck`

After code changes:

```bash
npm run build
docker-compose restart nakama
```

### Client (React)

```bash
cd client

# Install dependencies
npm install

# Configure environment — copy .env.example to .env and update Nakama host
cp .env.example .env

# Development
npm run dev     # http://localhost:5173

# Production build
npm run build   # Output in dist/
```

---

## Deployment Process

### Infrastructure

- **Backend**: GCP Compute Engine VM running Docker
- **Frontend**: Same VM, served via Nginx on port 80
- **Database**: Cloud-hosted PostgreSQL (Neon)

### Backend Deployment (Nakama)

```bash
# SSH into the VM


# Navigate to project
cd nakama

# Install dependencies and build
npm install
npm run build

# Configure .env with cloud Postgres credentials
cp .env.example .env
# Edit .env with actual values

# Start Nakama in background
docker-compose up -d

# Verify
docker-compose logs --tail 10
curl http://localhost:7350/healthcheck
```



### Frontend Deployment (Nginx)

```bash
cd client

# Install dependencies and build with production env
npm install
npm run build

# Copy built files to Nginx web root

# Restart Nginx
sudo systemctl restart nginx
```

Nginx serves the static files on port 80. No need to run a Node server or specify a port — visitors simply access `http://<vm-external-ip>`.

```
Note: Make sure to pen GCP firewall for relevant ports(80, 7350, 7351)
```


---

## How to Test Multiplayer

### Local Testing

1. Start the Nakama server: `cd nakama && docker-compose up`
2. Start the client dev server: `cd client && npm run dev`
3. Open **two browser tabs** at `http://localhost:5173`
4. Click **Play Classic** in Tab 1 — it creates a match and waits
5. Click **Play Classic** in Tab 2 — it joins the same match
6. The game starts. Take turns clicking cells
7. The board updates in real time on both tabs

Each browser tab gets a unique device ID (stored in `sessionStorage`), so both tabs are different players.

### Production Testing

1. Open `http://<vm-external-ip>` in two different browsers (or one normal + one incognito)
2. Both players click **Play Classic**
3. Play the game — moves sync in real time via WebSocket

### What to Verify

- **Matchmaking**: Second player auto-joins the first player's match
- **Turn enforcement**: Clicking a cell when it's not your turn shows "not your turn"
- **Win detection**: Three in a row highlights the winning line and shows result
- **Draw detection**: All cells filled with no winner shows "It's a draw!"
- **Disconnect handling**: Close one tab — the other player wins by forfeit
- **Leaderboard**: After a game, check the Leaderboard page for updated stats
- **Timed mode**: Click "Play Timed" — each turn has a 30-second countdown timer
