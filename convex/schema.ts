import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  usersBalances: defineTable({
    userId: v.id("users"),
    bridgeToken: v.number(),
  }),
  liqPool: defineTable({
    ticker: v.string(),
    teamName: v.string(),
    active: v.boolean(),
    teamTokenNum: v.number(),
    bridgeTokenNum: v.number(),
    teamImages: v.array(v.string()),
  }).index("by_ticker", ["ticker"]),
  holding: defineTable({
    userId: v.id("users"),
    tickerId: v.id("liqPool"),
    teamTokenNum: v.number(),
    bridgeTokenNum: v.number(),
  }).index("by_user_ticker", ["userId", "tickerId"])
  .index("by_ticker", ["tickerId"]).index("by_user", ["userId"]),
  history: defineTable({
    tickerId: v.id("liqPool"),
    bridgeTokenNum: v.number(),
    timestamp: v.number(),
  }).index("by_ticker", ["tickerId"]),
  wagers: defineTable({
    questionId: v.id("questions"),
    userId: v.id("users"),
    isYes: v.boolean(),
    amount: v.number(),
    active: v.boolean(),
  }).index("by_question_user", ["questionId", "userId"]),
  questions: defineTable({
    question: v.string(),
    createdBy: v.id("users"),
  }),
});
