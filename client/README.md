# Athena AI - Client

The frontend interface for the Athena AI Agentic Trading Platform. Built with React, Vite, and modern Web3 technologies, it provides a powerful dashboard for managing autonomous trading agents.

## 🛠️ Tech Stack

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **Web3**: [Wagmi](https://wagmi.sh/) + [RainbowKit](https://www.rainbowkit.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) + [Lucide React](https://lucide.dev/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)

## ✨ Features

- **Dashboard**: Real-time overview of portfolio performance and active agents.
- **Agent Control**: Deploy, start, stop, and configure autonomous trading agents.
- **Market Explorer**: visual interface to explore available markets and opportunities.
- **Wallet Integration**: Seamless connection with Web3 wallets for funding and withdrawals.
- **Activity Feed**: Live feed of agent actions and trade executions.
- **Instant Updates**: Optimistic UI ensures actions like selling or importing reflect immediately.
- **Auto-Refresh**: Trade history and positions automatically sync every 5 seconds.
- **Dark Mode**: Sleek, specialized dark interface for professional traders.

## 🚀 Setup & Installation

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Run Development Server**

   ```bash
   npm run dev
   ```

   The application will start at `http://localhost:5173` (by default).

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Connection
VITE_API_URL=http://localhost:5000/api

# Security (CRITICAL)
VITE_ADMIN_SECRET=your_secure_random_32_byte_string # Must match server ADMIN_SECRET
```

### Security
This client is configured to:
- Automatically inject `x-admin-secret` headers for authorized requests.
- Sanitize console logs to prevent data leakage.
- Handle secure cors communication with the backend.

## 🧩 Project Structure

- `src/components`: Reusable UI components and feature-specific blocks (AgentControl, MarketExplorer, etc.).
- `src/pages`: Main application views.
- `src/hooks`: Custom React hooks (Web3 integration, API fetchers).
- `src/context`: React Context providers.
- `src/lib`: Utility functions and API clients.

## 🔌 API Connection

The client connects to the **Athena AI Server** (usually running on port 5000). Ensure the backend server is running for full functionality including:
- Authentication (Login/Signup)
- Agent Deployment
- Trade Execution
- Historical Data

## 📦 Build for Production

To create a production-ready build:

```bash
npm run build
```

This will compile the application into the `dist` directory, ready to be deployed to any static site host (Vercel, Netlify, S3, etc.).
