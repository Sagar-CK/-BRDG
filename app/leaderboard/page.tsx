"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  userEmail: string;
  bridgeBalance: number;
  holdingsValue: number;
  totalValue: number;
}

export default function LeaderboardPage() {
  const leaderboard = useQuery(api.myFunctions.getLeaderboard);
  const router = useRouter();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-sm">
            {index + 1}
          </div>
        );
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700";
      case 1:
        return "bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-gray-200 dark:border-gray-700";
      case 2:
        return "bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trading
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🏆 Leaderboard
          </h1>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Top Traders</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Rankings based on total portfolio value (balance + holdings)
            </p>
          </div>

          {leaderboard ? (
            leaderboard.length === 0 ? (
              <Card className="text-center py-16">
                <CardContent>
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No traders yet!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Be the first to start trading and claim the top spot.
                  </p>
                  <Button onClick={() => router.push("/")}>
                    Start Trading
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry, index) => (
                  <Card
                    key={entry.userId}
                    className={`transition-all hover:shadow-md ${getRankBg(index)} border-2`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getRankIcon(index)}
                          <div>
                            <h3 className="font-bold text-lg">
                              {entry.userEmail.includes('@') 
                                ? entry.userEmail.split('@')[0] 
                                : entry.userEmail}
                            </h3>
                            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <span>
                                Balance: {Math.round(entry.bridgeBalance * 100) / 100} BRDG
                              </span>
                              <span>
                                Holdings: {Math.round(entry.holdingsValue * 100) / 100} BRDG
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round(entry.totalValue * 100) / 100}
                          </div>
                          <div className="text-sm text-gray-500">BRDG Total</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <div className="animate-pulse">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Loading rankings...</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Calculating portfolio values...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}