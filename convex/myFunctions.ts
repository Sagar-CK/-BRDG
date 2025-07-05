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

// export const sellTicker = mutation({
//   args: {
//     ticker: v.string(),
//     amount: v.number(),
//   },
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);

//     if (args.amount <= 0) {
//       throw new Error("Amount must be greater than 0");
//     }

//   },
// });

export const getNetWorth = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const userBalance = await ctx.db
      .query("usersBalances")
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    const bridgeTokenBalance = userBalance?.bridgeToken ?? 0;

    const holdings = await ctx.db
      .query("holding")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    let holdingsValue = 0;
    for (const holding of holdings) {
      const liqPool = await ctx.db.get(holding.tickerId);
      if (liqPool) {
        const T0 = liqPool.teamTokenNum;
        const B0 = liqPool.bridgeTokenNum;
        const k = T0 * B0;
        const T1 = T0 + holding.teamTokenNum;
        const B1 = k / T1;
        holdingsValue += B0 - B1;
      }
    }

    return bridgeTokenBalance + holdingsValue;
  },
});

// // You can read data from the database via a query:
// export const listNumbers = query({
//   // Validators for arguments.
//   args: {
//     count: v.number(),
//   },

//   // Query implementation.
//   handler: async (ctx, args) => {
//     //// Read the database as many times as you need here.
//     //// See https://docs.convex.dev/database/reading-data.
//     const numbers = await ctx.db
//       .query("numbers")
//       // Ordered by _creationTime, return most recent
//       .order("desc")
//       .take(args.count);
//     const userId = await getAuthUserId(ctx);
//     const user = userId === null ? null : await ctx.db.get(userId);
//     return {
//       viewer: user?.email ?? null,
//       numbers: numbers.reverse().map((number) => number.value),
//     };
//   },
// });

// // You can write data to the database via a mutation:
// export const addNumber = mutation({
//   // Validators for arguments.
//   args: {
//     value: v.number(),
//   },

//   // Mutation implementation.
//   handler: async (ctx, args) => {
//     //// Insert or modify documents in the database here.
//     //// Mutations can also read from the database like queries.
//     //// See https://docs.convex.dev/database/writing-data.

//     const id = await ctx.db.insert("numbers", { value: args.value });

//     console.log("Added new document with id:", id);
//     // Optionally, return a value from your mutation.
//     // return id;
//   },
// });

// You can fetch data from and send data to third-party APIs via an action:
// export const myAction = action({
//   // Validators for arguments.
//   args: {
//     first: v.number(),
//     second: v.string(),
//   },

//   // Action implementation.
//   handler: async (ctx) => {
//     //// Use the browser-like `fetch` API to send HTTP requests.
//     //// See https://docs.convex.dev/functions/actions#calling-third-party-apis-and-using-npm-packages.
//     // const response = await fetch("https://api.thirdpartyservice.com");
//     // const data = await response.json();

//     //// Query data by running Convex queries.
//     const data = await ctx.runQuery(api.myFunctions.listNumbers, {
//       count: 10,
//     });
//     console.log(data);

//     //// Write data by running Convex mutations.
//     await ctx.runMutation(api.myFunctions.addNumber, {
//       value: args.first,
//     });
//   },
// });
