# $BRDG – Bet on the Bridge

An open marketplace for betting on co-founder relationships, team breakups, and other pivotal events. Inspired by Polymarket, `$BRDG` lets you speculate on the future of teams and founders in a fun, interactive way.

## Features
- **User Authentication:** Sign up and sign in securely with password-based auth.
- **Token Balances:** Every user gets a balance of `$BRDG` tokens to participate in markets.
- **Liquidity Pools:** Bet on different teams/events by buying and selling tokens in their respective pools.
- **Automated Market Making:** Prices are determined by a bonding curve, simulating real market dynamics.
- **Real-Time Charts:** Visualize price history and market activity for each pool.
  
## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend/Database:** Convex (serverless functions & data)
- **Authentication:** Convex Auth
- **Charts:** Recharts
- **Other:** TypeScript, ESLint, Prettier

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- [Convex CLI](https://docs.convex.dev/cli/install) (`npm install -g convex`)

### Setup
1. **Clone the repository:**
   ```bash
   git clone git@github.com:Sagar-CK/bet-on-the-bridge.git
   cd bet-on-the-bridge
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up Convex:**
   - Create a [Convex project](https://dashboard.convex.dev/).
   - Copy your deployment URL and set it in a `.env.local` file:
     ```env
     NEXT_PUBLIC_CONVEX_URL="https://<your-convex-deployment>.convex.cloud"
     ```
   - Push schema and functions:
     ```bash
     convex dev
     ```
4. **Run the app:**
   ```bash
   npm run dev
   ```
   This will start both the frontend (Next.js) and backend (Convex) in parallel.

## Usage
- Sign up or sign in with your email and password.
- View available markets (liquidity pools) and your $BRDG balance.
- Buy or sell tokens in any pool to bet on outcomes.
- Watch real-time price charts to track market sentiment.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/YourFeature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/YourFeature`)
5. Open a pull request

---

_Made by The Bridge Builders, randomly at 4 AM._
