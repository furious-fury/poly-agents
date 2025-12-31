# Athena AI - Server

The backend service for the Athena AI Agentic Trading platform. This server manages trading agents, risk analysis, portfolio tracking, and handles the job queue for executing trades.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Queue/Caching**: Redis (BullMQ)
- **Logging**: Pino
- **AI/LLM**: OpenAI / Google GenAI (for agent logic)
- **Blockchain**: Viem / Ethers.js
- **Markets**: Polymarket CLOB Client

## 📋 Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

## 🚀 Setup & Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**

Create a `.env` file in the root directory with the following:

```env
# Server Configuration
PORT=5000
NODE_ENV=development # Set to 'production' on deployment

# Security (CRITICAL)
ADMIN_SECRET=your_secure_random_32_byte_string # Protects sensitive endpoints
FRONTEND_DOMAIN=http://localhost:5173 # Allowed CORS origin (use https://your-domain.com in prod)

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/athena_db"
REDIS_URL="redis://localhost:6379"

# Blockchain Provider
POLYGON_RPC_URL="https://polygon-rpc.com"

# Smart Wallet (Pimlico)
PIMLICO_API_KEY=your_pimlico_key

# Encryption
ENCRYPTION_KEY=your_32_byte_encryption_key
```

### Security Features
- **API Authentication:** Sensitive endpoints (e.g., wallet export) require `x-admin-secret` header.
- **Rate Limiting:** Protects against brute-force attacks.
- **Input Validation:** Strict Zod schemas for all user inputs.
- **Secure Headers:** Helmet.js protection enabled.
- **CORS:** Strict origin enforcement in production.

### API Endpoints
The API is exposed at `http://localhost:5000/api`.

3. **Database Setup**
   Run the Prisma migrations to set up your database schema:
   ```bash
   npx prisma migrate dev
   ```

## 🏃‍♂️ Running the Server

**Development Mode** (with hot-reload):
```bash
npm run dev
```

**Production Start**:
```bash
npm run build
npm start
```

## 📡 API Documentation

### Authentication
- **Login / Signup**
  - `POST /api/auth/login`
  - Body: `{ "walletAddress": "0x..." }`
  - Description: Authenticates user by wallet address. Creates a new user and seeds default agents if the user does not exist.

### Market Data
- **Get Markets**
  - `GET /api/market`
  - Query: `?limit=50`
  - Description: Fetches active events and markets from Polymarket.

### Trade Management
- **Execute Agent Trade**
  - `POST /api/trade/agent`
  - Body: `{ "agentId": "...", "marketId": "...", "amount": 100, "side": "BUY", "outcome": "YES" }`
  - Description: Queues a trade job for a specific agent.

### Portfolio & Risk
- **Get User Portfolio**
  - `GET /api/portfolio/:userId`
  - Description: Returns user positions, balances, and partial PnL.

- **Get Risk Exposure**
  - `GET /api/risk/exposure/:userId`
  - Description: Returns total calculated risk exposure metrics.

### Queue Management
- **Get Queue Status**
  - `GET /api/queue/status`
  - Returns metrics: `queueLength`, `delayedLength`, `retries`, `activeWorkers`.

- **Get Pending Jobs**
  - `GET /api/queue/jobs`
  - Lists currently queued and delayed jobs.

## 🏗️ Architecture Overview

- **Server Entry**: `src/server.ts` initializes Redis, Agent Workers, and the Express App.
- **Agents**: Logic for trading agents is encapsulated in `src/agents`.
- **Workers**: `src/workers` contains `AgentWorker` which runs in the background to process trade jobs from the queue.
- **Services**: Business logic is separated into services (`TradeService`, `RiskService`, `PortfolioService`, `ActiveMarketScanner`).
- **Tools**: Integrations with external APIs (Polymarket, etc.) are in `src/tools`.

## 🧠 Core Services

### Active Market Scanner
A two-stage hybrid analysis engine:
1.  **Macro Scan**: Periodically fetches top 100 markets from Polymarket graph.
2.  **Micro Analysis**: Selects 5 random high-potential markets per tick for deep LLM analysis.

### Position Manager (Automated Risk)
Runs at the start of every agent tick to enforce risk limits:
-   **Stop Loss**: Automatically sells positions if PnL drops below agent's `stopLossPercent`.
-   **Take Profit**: Automatically sells positions if PnL exceeds agent's `takeProfitPercent`.
-   **Default Agents**:
    -   **Conservative**: 20% SL / 100% TP
    -   **Balanced**: 30% SL / 200% TP
    -   **Aggressive**: 50% SL / 500% TP

### Automated Trade Execution
- **Allowance Checks**: Automatically detects and approves USDC allowances before placing orders.
- **Decimal Sanitization**: Handles precise floating-point math for reliable trade execution globally.
