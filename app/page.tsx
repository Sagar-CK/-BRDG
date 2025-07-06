"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChartAreaInteractive } from "@/components/ui/chart-area-interactive";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";

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
  const totalWageredResult = useQuery(api.myFunctions.getTotalWageredAmount);
  const totalWagered = typeof totalWageredResult === "object" && totalWageredResult !== null
    ? totalWageredResult.totalWagered ?? 0
    : 0;
  const liqPools = useQuery(api.myFunctions.getAllLiqPools);
  const router = useRouter();
  const [showBuySellLines, setShowBuySellLines] = useState(true);
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    ensureUserBalance();
  }, [ensureUserBalance]);

  // Calculate total including wagers
  const total = (typeof portfolioValue === "object" && portfolioValue !== null
    ? (portfolioValue.totalValue ?? 0)
    : 0) + totalWagered;

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Image src="/bridge.png" alt="The Bridge" width={80} height={80} />
        <h1 className="text-2xl font-bold self-center">
          $BRDG
        </h1>
        <div className="flex flex-row gap-x-4 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/leaderboard")}
            className="flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Leaderboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/wagers")}
            className="flex items-center gap-2"
          >
            Wagers
          </Button>
          <div className="flex flex-col text-right">
            <p className="text-sm">Balance: {userBalance?.balance ?? 0} BRDG</p>
            <p className="text-xs text-gray-500">
              Holdings: {typeof portfolioValue === "object" && portfolioValue !== null
                ? Math.round((portfolioValue.holdingsValue ?? 0) * 100) / 100
                : 0} BRDG
            </p>
            <p className="text-xs text-blue-500">
              Wagers: {totalWagered} BRDG
            </p>
            <p className="text-xs font-semibold">
              Total: {Math.round(total * 100) / 100} BRDG
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <div className="flex items-center gap-4 px-8 pt-4">
        <input
          type="checkbox"
          id="global-toggle-buy-sell-lines"
          checked={showBuySellLines}
          onChange={() => setShowBuySellLines(v => !v)}
          className="accent-green-500"
        />
        <label htmlFor="global-toggle-buy-sell-lines" className="text-xs select-none cursor-pointer">
          Show Buy/Sell Lines (Global)
        </label>
        <div className="flex items-center gap-2">
          <label htmlFor="global-time-range" className="text-xs select-none cursor-pointer">Time Range:</label>
          <select
            id="global-time-range"
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="rounded-lg border px-2 py-1 text-xs"
          >
            <option value="1hr">Last 1 hour</option>
            <option value="24hrs">Last 24 hours</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
      <main className="p-8 flex flex-col gap-8">
        {liqPools && <Content liqPools={liqPools} showBuySellLines={showBuySellLines} timeRange={timeRange} />}
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

function Content({ liqPools, showBuySellLines, timeRange }: { liqPools: LiqPool[], showBuySellLines: boolean, timeRange: string }) {
  // Sort pools by current price (bridgeTokenNum / teamTokenNum) in descending order
  const sortedPools = [...liqPools].sort((a, b) => {
    const priceA = a.bridgeTokenNum / a.teamTokenNum;
    const priceB = b.bridgeTokenNum / b.teamTokenNum;
    return priceB - priceA; // Descending order (highest price first)
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {sortedPools.map((liqPool, index) => (
        <LiqPoolChart
          key={liqPool.ticker || index}
          liqPool={liqPool}
          showBuySellLines={showBuySellLines}
          timeRange={timeRange}
        />
      ))}
    </div>
  );
}

function LiqPoolChart({ liqPool, showBuySellLines, timeRange }: { liqPool: LiqPool, showBuySellLines: boolean, timeRange: string }) {
  const tickerData = useQuery(api.myFunctions.getTickerData, {
    ticker: liqPool.ticker,
  }); 
  // Prepare data with visual points
  let chartData = tickerData?.filter((item) => item.bridgeTokenNum > 0).map((item) => ({
    date: new Date(item.timestamp).toISOString(),
    price: item.bridgeTokenNum,
    synthetic: false,
  })) ?? [];

  // Add visual start point (initial price of 1 BRDG per team token)
  chartData = [
    { date: "2025-06-29T00:00:00.000Z", price: 1, synthetic: true },
    ...chartData,
  ];

  // Add visual end point (current time, latest price)
  if (chartData.length > 1) {
    const latestPrice = chartData[chartData.length - 1].price;
    chartData = [
      ...chartData,
      { date: new Date().toISOString(), price: latestPrice, synthetic: true },
    ];
  }

  return (
    <ChartAreaInteractive
      data={chartData}
      teamMembers={liqPool.teamName}
      teamName={liqPool.ticker}
      teamImages={liqPool.teamImages}
      showBuySellLines={showBuySellLines}
      timeRange={timeRange}
    />
  );
}

