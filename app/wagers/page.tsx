"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Id } from "../../convex/_generated/dataModel";

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

export default function WagersPage() {
  const userBalance = useQuery(api.myFunctions.getUserBalance);
  const portfolioValue = useQuery(api.myFunctions.getTotalPortfolioValue);
  const totalWageredResult = useQuery(api.myFunctions.getTotalWageredAmount);
  const totalWagered = typeof totalWageredResult === "object" && totalWageredResult !== null
    ? totalWageredResult.totalWagered ?? 0
    : 0;
  const createQuestion = useMutation(api.myFunctions.createQuestion);
  const placeWager = useMutation(api.myFunctions.placeWager);
  const questions = useQuery(api.myFunctions.getQuestionsWithMarket);
  const router = useRouter();
  const resolveQuestion = useMutation(api.myFunctions.resolveQuestion);

  // State for new question
  const [newQuestion, setNewQuestion] = useState("");
  const [creating, setCreating] = useState(false);

  // State for placing wagers
  const [wagerAmounts, setWagerAmounts] = useState<{ [id: string]: string }>({});
  const [wagerSides, setWagerSides] = useState<{ [id: string]: boolean }>({});
  const [placing, setPlacing] = useState<{ [id: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  // State for resolving questions
  const [resolving, setResolving] = useState<{ [id: string]: boolean }>({});
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState<{ [id: string]: boolean }>({});
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch userId from userBalance (if available)
  useEffect(() => {
    if (userBalance?.userId) {
      setUserId(userBalance.userId);
    }
  }, [userBalance]);

  const handleCreateQuestion = async () => {
    setCreating(true);
    setError(null);
    try {
      await createQuestion({ question: newQuestion });
      setNewQuestion("");
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Unknown error");
    }
    setCreating(false);
  };

  const handlePlaceWager = async (questionId: Id<"questions">) => {
    setPlacing((p) => ({ ...p, [questionId]: true }));
    setError(null);
    try {
      await placeWager({
        questionId,
        isYes: wagerSides[questionId] ?? true,
        amount: Number(wagerAmounts[questionId]),
      });
      setWagerAmounts((a) => ({ ...a, [questionId]: "" }));
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
      else setError("Unknown error");
    }
    setPlacing((p) => ({ ...p, [questionId]: false }));
  };

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
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            Stocks
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
              Total: {Math.round(((typeof portfolioValue === "object" && portfolioValue !== null ? (portfolioValue.totalValue ?? 0) : 0) + totalWagered) * 100) / 100} BRDG
            </p>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto p-8 flex flex-col gap-8">
        <h1 className="text-2xl font-bold mb-4">Prediction Markets</h1>
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Create a new market</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Will it rain tomorrow in NYC?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              disabled={creating}
            />
            <Button onClick={handleCreateQuestion} disabled={creating || !newQuestion.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
        {error && <div className="text-red-500">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {questions?.length === 0 && <div>No markets yet. Create one above!</div>}
          {questions?.map((q) => {
            const isCreator = userId && q.createdBy === userId;
            return (
              <Card key={q._id} className="p-4 flex flex-col gap-2">
                <div className="font-semibold text-lg">{q.question}</div>
                <div className="flex gap-4 items-center">
                  <div>
                    <span className="font-bold text-green-600">{q.yesPct.toFixed(1)}%</span> Yes
                  </div>
                  <div>
                    <span className="font-bold text-red-600">{q.noPct.toFixed(1)}%</span> No
                  </div>
                  <div className="text-xs text-gray-500">Total: {q.total} BRDG</div>
                </div>
                {isCreator ? (
                  <div className="flex gap-2 items-center mt-2">
                    <select
                      value={resolveAnswer[q._id] === undefined ? "yes" : (resolveAnswer[q._id] ? "yes" : "no")}
                      onChange={(e) =>
                        setResolveAnswer((s) => ({
                          ...s,
                          [q._id]: e.target.value === "yes",
                        }))
                      }
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <Button
                      onClick={async () => {
                        setResolving((r) => ({ ...r, [q._id]: true }));
                        setResolveError(null);
                        try {
                          await resolveQuestion({
                            questionId: q._id,
                            correctAnswer: resolveAnswer[q._id] ?? true,
                          });
                        } catch (e) {
                          setResolveError(e instanceof Error ? e.message : "Unknown error");
                        }
                        setResolving((r) => ({ ...r, [q._id]: false }));
                      }}
                      disabled={resolving[q._id]}
                    >
                      {resolving[q._id] ? "Resolving..." : "Resolve"}
                    </Button>
                    {resolveError && <div className="text-red-500">{resolveError}</div>}
                  </div>
                ) : (
                  <div className="flex gap-2 items-center mt-2">
                    <select
                      value={wagerSides[q._id] === undefined ? "yes" : (wagerSides[q._id] ? "yes" : "no")}
                      onChange={(e) =>
                        setWagerSides((s) => ({
                          ...s,
                          [q._id]: e.target.value === "yes",
                        }))
                      }
                      className="rounded-lg border px-2 py-1 text-xs"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Amount"
                      value={wagerAmounts[q._id] ?? ""}
                      onChange={(e) =>
                        setWagerAmounts((a) => ({
                          ...a,
                          [q._id]: e.target.value,
                        }))
                      }
                      className="w-24"
                    />
                    <Button
                      onClick={() => handlePlaceWager(q._id)}
                      disabled={
                        placing[q._id] ||
                        !wagerAmounts[q._id] ||
                        Number(wagerAmounts[q._id]) <= 0 ||
                        Number(wagerAmounts[q._id]) > (userBalance?.balance ?? 0)
                      }
                    >
                      {placing[q._id] ? "Betting..." : "Bet"}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
