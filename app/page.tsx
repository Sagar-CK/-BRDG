"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";
import { useEffect } from "react";

interface LiqPool {
  ticker: string;
  teamName: string;
  active: boolean;
  teamTokenNum: number;
  bridgeTokenNum: number;
  teamImages: string[];
}

export default function Home() {
  const ensureUserBalance = useMutation(api.myFunctions.ensureUserBalance);
  const userBalance = useQuery(api.myFunctions.getUserBalance);
  const portfolioValue = useQuery(api.myFunctions.getTotalPortfolioValue);
  const leaderboard = useQuery(api.myFunctions.getLeaderboard);
  const liqPools = useQuery(api.myFunctions.getAllLiqPools);

  useEffect(() => {
    ensureUserBalance();
  }, [ensureUserBalance]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Image src="/bridge.png" alt="The Bridge" width={80} height={80} />
        <h1 className="text-2xl font-bold self-center">
          $BRDG
        </h1>
        <div className="flex flex-row gap-x-4 items-center">
          <div className="flex flex-col text-right">
            <p className="text-sm">Balance: {userBalance?.balance ?? 0} BRDG</p>
            <p className="text-xs text-gray-500">Holdings: {Math.round((portfolioValue?.holdingsValue ?? 0) * 100) / 100} BRDG</p>
            <p className="text-xs font-semibold">Total: {Math.round((portfolioValue?.totalValue ?? 0) * 100) / 100} BRDG</p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="p-8 flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {liqPools && <Content liqPools={liqPools} />}
          </div>
          <div className="lg:w-80">
            {leaderboard ? (
              <Leaderboard leaderboard={leaderboard} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">🏆 Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <p>Loading...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <Button
          variant="destructive"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </Button>
      )}
    </>
  );
}

function Content({ liqPools }: { liqPools: LiqPool[] }) {
  // Sort pools by current price (bridgeTokenNum / teamTokenNum) in descending order
  const sortedPools = [...liqPools].sort((a, b) => {
    const priceA = a.bridgeTokenNum / a.teamTokenNum;
    const priceB = b.bridgeTokenNum / b.teamTokenNum;
    return priceB - priceA; // Descending order (highest price first)
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {sortedPools.map((liqPool, index) => (
        <LiqPoolChart key={liqPool.ticker || index} liqPool={liqPool} />
      ))}
    </div>
  );
}

function LiqPoolChart({ liqPool }: { liqPool: LiqPool }) {
  const tickerData = useQuery(api.myFunctions.getTickerData, {
    ticker: liqPool.ticker,
  }); 
  // Prepare data with visual points
  let chartData = tickerData?.filter((item) => item.bridgeTokenNum > 0).map((item) => ({
    date: new Date(item.timestamp).toISOString(),
    price: item.bridgeTokenNum,
  })) ?? [];

  // Add visual start point (initial price of 1 BRDG per team token)
  chartData = [
    { date: "2025-06-29T00:00:00.000Z", price: 1},
    ...chartData,
  ];

  // Add visual end point (current time, latest price)
  if (chartData.length > 1) {
    const latestPrice = chartData[chartData.length - 1].price;
    chartData = [
      ...chartData,
      { date: new Date().toISOString(), price: latestPrice},
    ];
  }

  return (
    <ChartAreaInteractive
      data={chartData}
      teamMembers={liqPool.teamName}
      teamName={liqPool.ticker}
      teamImages={liqPool.teamImages}
    />
  );
}

interface LeaderboardEntry {
  userId: string;
  userEmail: string;
  bridgeBalance: number;
  holdingsValue: number;
  totalValue: number;
}

function Leaderboard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">🏆 Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No traders yet!</p>
            <p className="text-sm">Be the first to start trading.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-32">
                    {entry.userEmail.includes('@') ? entry.userEmail.split('@')[0] : entry.userEmail}
                  </p>
                  <p className="text-xs text-gray-500">
                    Holdings: {Math.round(entry.holdingsValue * 100) / 100}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">
                  {Math.round(entry.totalValue * 100) / 100}
                </p>
                <p className="text-xs text-gray-500">BRDG</p>
              </div>
            </div>
          ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}