"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  const netWorth = useQuery(api.myFunctions.getNetWorth);
  const liqPools = useQuery(api.myFunctions.getAllLiqPools);

  useEffect(() => {
    ensureUserBalance();
  }, [ensureUserBalance]);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Image src="/bridge.png" alt="The Bridge" width={80} height={80} />
        <h1 className="text-2xl font-bold self-center">$BRDG</h1>
        <div className="flex flex-row gap-x-4 items-center">
          <p className="text-sm">Net Worth: {netWorth ?? 0}</p>
          <p className="text-sm">Balance: {userBalance?.balance ?? 0}</p>
          <SignOutButton />
        </div>
      </header>
      <main className="p-8 flex flex-col gap-8">
        {liqPools && <Content liqPools={liqPools} />}
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
  let chartData =
    tickerData
      ?.filter((item) => item.bridgeTokenNum > 0)
      .map((item) => ({
        date: new Date(item.timestamp).toISOString(),
        price: item.bridgeTokenNum - 1,
      })) ?? [];

  // Add visual start point (price 1 at start of time)
  chartData = [{ date: "2025-06-29T00:00:00.000Z", price: 0 }, ...chartData];

  // Add visual end point (current time, latest price)
  if (chartData.length > 1) {
    const latestPrice = chartData[chartData.length - 1].price;
    chartData = [
      ...chartData,
      { date: new Date().toISOString(), price: latestPrice },
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
