import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

export const ensureUserBalance = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (userBalance === null && userId !== null) {
      await ctx.db.insert("usersBalances", {
        userId: userId,
        bridgeToken: 1000,
      });
    }
    return { ok: true };
  },
});

export const getUserBalance = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    return {
      balance: userBalance?.bridgeToken ?? 0,
      userId: userId ?? null,
    };
  },
});

export const createLiqPool = mutation({
  args: {
    ticker: v.string(),
    teamName: v.string(),
    active: v.boolean(),
    teamImages: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // if the liq pool doesn't exist, create it
    const liqPool = await ctx.db
      .query("liqPool")
      .filter((q) => q.eq(q.field("ticker"), args.ticker))
      .first();
    if (liqPool === null) {
      await ctx.db.insert("liqPool", {
        ticker: args.ticker,
        teamName: args.teamName,
        active: args.active,
        teamTokenNum: 1000,
        bridgeTokenNum: 1000,
        teamImages: args.teamImages,
      });
    } else {
      await ctx.db.patch(liqPool._id, {
        teamName: args.teamName,
        teamImages: args.teamImages,
        active: args.active,
      });
    }
  },
});

export const getLiqPool = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    const liqPool = await ctx.db
      .query("liqPool")
      .filter((q) => q.eq(q.field("ticker"), args.ticker))
      .first();
    return liqPool;
  },
});

export const getAllLiqPools = query({
  handler: async (ctx) => {
    const liqPools = await ctx.db.query("liqPool").filter((q) => q.eq(q.field("active"), true)).collect()
    return liqPools;
  },
});

export const getTickerData = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    // get all history entries for the ticker
    const liqPool = await ctx.db
      .query("liqPool")
      .filter((q) => q.eq(q.field("ticker"), args.ticker))
      .first();
    const history = await ctx.db
      .query("history")
      .filter((q) => q.eq(q.field("tickerId"), liqPool?._id))
      .collect();
    return history;
  },
});

export const buyTicker = mutation({
  args: {
    ticker: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    if (userBalance === null || userBalance.bridgeToken < args.amount) {
      throw new Error("Insufficient balance");
    }

    const trueAmount = Math.min(userBalance.bridgeToken, args.amount);

    if (userId !== null) {
      const liqPool = await ctx.runQuery(api.myFunctions.getLiqPool, {
        ticker: args.ticker,
      });
      if (liqPool !== null) {
        // Calculate k = bridgeTokenNum * teamTokenNum
        const k = liqPool.bridgeTokenNum * liqPool.teamTokenNum;

        // Add user's BRDG input to pool
        const newBridgeTokenNum = liqPool.bridgeTokenNum + trueAmount;

        // Calculate new team token amount using k = brdg * team
        const newTeamTokenNum = k / newBridgeTokenNum;

        // Calculate team tokens user receives
        const teamTokensOut = liqPool.teamTokenNum - newTeamTokenNum;

        await ctx.db.patch(userBalance._id, {
          bridgeToken: userBalance.bridgeToken - trueAmount,
        });

        // Update liquidity pool with new amounts
        await ctx.db.patch(liqPool._id, {
          bridgeTokenNum: newBridgeTokenNum,
          teamTokenNum: newTeamTokenNum,
        });

        // create a history entry
        await ctx.db.insert("history", {
          tickerId: liqPool._id,
          bridgeTokenNum: newBridgeTokenNum / newTeamTokenNum,
          timestamp: Date.now(),
        });

        // Update holding if it exists
        const holding = await ctx.db
          .query("holding")
          .filter((q) => q.eq(q.field("userId"), userId))
          .filter((q) => q.eq(q.field("tickerId"), liqPool._id))
          .first();
        if (holding !== null) {
          await ctx.db.patch(holding._id, {
            teamTokenNum: teamTokensOut + holding.teamTokenNum,
            bridgeTokenNum: trueAmount + holding.bridgeTokenNum,
          });
        } else {
          await ctx.db.insert("holding", {
            userId: userId,
            tickerId: liqPool._id,
            teamTokenNum: teamTokensOut,
            bridgeTokenNum: trueAmount,
          });
        }
      }
    }
  },
});

export const sellTicker = mutation({
  args: {
    ticker: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    const liqPool = await ctx.runQuery(api.myFunctions.getLiqPool, {
      ticker: args.ticker,
    });
    if (liqPool === null) {
      throw new Error("Liquidity pool not found");
    }
    const holding = await ctx.db
      .query("holding")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("tickerId"), liqPool._id))
      .first();

    if (holding === null) {
      throw new Error("You don't have any holdings of this ticker");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const trueBridgeTokenNum = await ctx.runQuery(api.myFunctions.getCurrentHoldings, {
      ticker: args.ticker,
    });

    if (userBalance === null || trueBridgeTokenNum < args.amount) {
      throw new Error("Insufficient balance");
    }

    const trueAmount = Math.min(trueBridgeTokenNum, args.amount);

    const k = liqPool.bridgeTokenNum * liqPool.teamTokenNum;

    const newBridgeTokenNum = liqPool.bridgeTokenNum - trueAmount;

    const newTeamTokenNum = k / newBridgeTokenNum;

    const teamTokensOut = liqPool.teamTokenNum - newTeamTokenNum;

    await ctx.db.patch(userBalance._id, {
      bridgeToken: userBalance.bridgeToken + trueAmount,
    });

    await ctx.db.patch(liqPool._id, {
      bridgeTokenNum: newBridgeTokenNum,
      teamTokenNum: newTeamTokenNum,
    });

    await ctx.db.insert("history", {
      tickerId: liqPool._id,
      bridgeTokenNum: newBridgeTokenNum / newTeamTokenNum,
      timestamp: Date.now(),
    });

    if (holding !== null) {
      await ctx.db.patch(holding._id, {
        teamTokenNum: teamTokensOut + holding.teamTokenNum,
        bridgeTokenNum: trueAmount + holding.bridgeTokenNum,
      });
    } else {
      throw new Error("You don't have any holdings of this ticker");
    }
  },
});

export const getCurrentHoldings = query({
  args: {
    ticker: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const liqPool = await ctx.db
      .query("liqPool")
      .filter((q) => q.eq(q.field("ticker"), args.ticker))
      .first();
    if (!liqPool || !userId) return -1;

    const holdings = await ctx.db
      .query("holding")
      .filter((q) => q.eq(q.field("userId"), userId))
      .filter((q) => q.eq(q.field("tickerId"), liqPool._id))
      .first();

    const teamTokenNum = holdings?.teamTokenNum ?? 0;

    // Calculate how much BRDG the user would get if they sold all their team tokens
    let bridgeValue = 0;
    if (teamTokenNum > 0) {
      const T0 = liqPool.teamTokenNum;
      const B0 = liqPool.bridgeTokenNum;
      const k = T0 * B0;
      const T1 = T0 + teamTokenNum;
      const B1 = k / T1;
      bridgeValue = B0 - B1;
    }

    return bridgeValue;
  },
});

export const getTotalPortfolioValue = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    // Get user's BRDG balance
    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    const bridgeBalance = userBalance?.bridgeToken ?? 0;

    // Get all user's holdings
    const holdings = await ctx.db
      .query("holding")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    let totalHoldingsValue = 0;

    // Calculate value of each holding
    for (const holding of holdings) {
      const liqPool = await ctx.db.get(holding.tickerId);
      if (liqPool) {
        const teamTokenNum = holding.teamTokenNum;
        
        // Calculate how much BRDG the user would get if they sold all their team tokens
        if (teamTokenNum > 0) {
          const T0 = liqPool.teamTokenNum;
          const B0 = liqPool.bridgeTokenNum;
          const k = T0 * B0;
          const T1 = T0 + teamTokenNum;
          const B1 = k / T1;
          const bridgeValue = B0 - B1;
          totalHoldingsValue += bridgeValue;
        }
      }
    }

    return {
      bridgeBalance,
      holdingsValue: totalHoldingsValue,
      totalValue: bridgeBalance + totalHoldingsValue,
    };
  },
});

export const getLeaderboard = query({
  handler: async (ctx) => {
    // Get all users with balances
    const allBalances = await ctx.db.query("usersBalances").collect();
    const leaderboard = [];

    for (const userBalance of allBalances) {
      const userId = userBalance.userId;
      const bridgeBalance = userBalance.bridgeToken;

      // Get all user's holdings
      const holdings = await ctx.db
        .query("holding")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();

      let totalHoldingsValue = 0;

      // Calculate value of each holding
      for (const holding of holdings) {
        try {
          const liqPool = await ctx.db.get(holding.tickerId);
          if (liqPool && liqPool.teamTokenNum > 0 && liqPool.bridgeTokenNum > 0) {
            const teamTokenNum = holding.teamTokenNum;
            
            // Calculate how much BRDG the user would get if they sold all their team tokens
            if (teamTokenNum > 0) {
              const T0 = liqPool.teamTokenNum;
              const B0 = liqPool.bridgeTokenNum;
              const k = T0 * B0;
              const T1 = T0 + teamTokenNum;
              
              // Prevent division by zero
              if (T1 > 0) {
                const B1 = k / T1;
                const bridgeValue = B0 - B1;
                if (bridgeValue > 0) {
                  totalHoldingsValue += bridgeValue;
                }
              }
            }
          }
        } catch (error) {
          // Skip this holding if there's an error
          console.warn("Error calculating holding value:", error);
        }
      }

      const totalValue = bridgeBalance + totalHoldingsValue;

      // Get user info
      let userEmail = "Anonymous";
      try {
        const user = await ctx.db.get(userId);
        userEmail = user?.email ?? "Anonymous";
      } catch (error) {
        console.warn("Error fetching user info:", error);
      }
      
      leaderboard.push({
        userId,
        userEmail,
        bridgeBalance,
        holdingsValue: totalHoldingsValue,
        totalValue,
      });
    }

    // Sort by total value (highest first) and return top 10
    return leaderboard
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  },
});

export const createQuestion = mutation({
  args: { question: v.string()},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("questions", { question: args.question, createdBy: userId });
  },
});

export const placeWager = mutation({
  args: {
    questionId: v.id("questions"),
    isYes: v.boolean(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (args.amount <= 0) throw new Error("Amount must be greater than 0");

    // Prevent creator from betting on their own question
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found");
    if (question.createdBy === userId) {
      throw new Error("Creators cannot bet on their own question");
    }

    // Check user balance
    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
    if (!userBalance || userBalance.bridgeToken < args.amount) {
      throw new Error("Insufficient balance");
    }

    // Deduct from user
    await ctx.db.patch(userBalance._id, {
      bridgeToken: userBalance.bridgeToken - args.amount,
    });

    // Add wager
    await ctx.db.insert("wagers", {
      questionId: args.questionId,
      userId,
      isYes: args.isYes,
      amount: args.amount,
      active: true,
    });
  },
});

export const getQuestionsWithMarket = query({
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();
    const results = [];
    for (const q of questions) {
      const wagers = await ctx.db
        .query("wagers")
        .filter((w) => w.eq(w.field("questionId"), q._id))
        .collect();
      const yes = wagers.filter((w) => w.isYes).reduce((sum, w) => sum + w.amount, 0);
      const no = wagers.filter((w) => !w.isYes).reduce((sum, w) => sum + w.amount, 0);
      const total = yes + no;
      results.push({
        ...q,
        yes,
        no,
        yesPct: total ? (yes / total) * 100 : 0,
        noPct: total ? (no / total) * 100 : 0,
        total,
      });
    }
    return results;
  },
});

export const getWagersForQuestion = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wagers")
      .filter((w) => w.eq(w.field("questionId"), args.questionId))
      .collect();
  },
});

export const getTotalWageredAmount = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const wagers = await ctx.db
      .query("wagers")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    const totalWagered = wagers.reduce((sum, w) => sum + (w.amount ?? 0), 0);
    return { totalWagered };
  },
});

// Mutation to resolve a question and distribute payouts
export const resolveQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    correctAnswer: v.boolean(), // true for yes, false for no
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found");
    if (question.createdBy !== userId) {
      throw new Error("Only the creator can resolve this question");
    }

    // Get all wagers for this question
    const wagers = await ctx.db
      .query("wagers")
      .filter((w) => w.eq(w.field("questionId"), args.questionId))
      .collect();

    // Mark all wagers as inactive
    for (const wager of wagers) {
      await ctx.db.patch(wager._id, { active: false });
    }

    // Calculate pools
    const winningWagers = wagers.filter((w) => w.isYes === args.correctAnswer);
    const losingWagers = wagers.filter((w) => w.isYes !== args.correctAnswer);
    const winningPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);
    const losingPool = losingWagers.reduce((sum, w) => sum + w.amount, 0);

    // Distribute payouts
    for (const winner of winningWagers) {
      // payout = their bet + (their bet / winningPool) * losingPool
      const payout = winner.amount + (winningPool > 0 ? (winner.amount / winningPool) * losingPool : 0);
      // Credit payout to user
      const userBalance = await ctx.db
        .query("usersBalances")
        .filter((q) => q.eq(q.field("userId"), winner.userId))
        .first();
      if (userBalance) {
        await ctx.db.patch(userBalance._id, {
          bridgeToken: userBalance.bridgeToken + payout,
        });
      }
    }
  },
});

