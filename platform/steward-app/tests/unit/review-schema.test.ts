import { describe, expect, it } from "vitest";
import { planFromStrategySelection } from "../../src/steward/behavior-planning.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";
import {
  parseConstitutionalReview,
  reviewOutcomes,
} from "../../src/steward/review-schema.js";
import { selectConversationStrategies } from "../../src/steward/strategy-selection.js";
import { makeReview } from "../fixtures/review-fixtures.js";

const learnerMessage =
  "Should I move, and can you guarantee that it will work out?";
const strategySelection = selectConversationStrategies({
  learnerMessage,
  currentConversation: [],
  availableStrategies: conversationStrategyIds,
});
const plan = planFromStrategySelection(learnerMessage, strategySelection);
const context = { strategySelection, plan };

describe("EN-003 constitutional review schema", () => {
  it("uses explicit review outcomes", () => {
    expect(reviewOutcomes).toEqual([
      "APPROVED",
      "REVISION_REQUIRED",
      "REJECTED",
    ]);
  });

  it("accepts an approved review covering every required scope", () => {
    const review = makeReview(context);
    expect(parseConstitutionalReview(review, context)).toEqual(review);
    expect(review.strategyCompliance).toHaveLength(
      1 + strategySelection.secondary.length,
    );
    expect(review.behaviorPlanCompliance).toHaveLength(plan.components.length);
    expect(review.principleResults).toHaveLength(10);
    expect(review.harmSafety.passes).toBe(true);
  });

  it.each([
    { kind: "strategy" as const, id: strategySelection.primary },
    { kind: "behavior" as const, id: plan.components[0]!.id },
    { kind: "harm-safety" as const },
    { kind: "principle" as const, id: "ST-BT-007" as const },
  ])("accepts a consistent $kind failure", (failure) => {
    const review = makeReview(context, failure, "REVISION_REQUIRED");
    expect(parseConstitutionalReview(review, context).outcome).toBe(
      "REVISION_REQUIRED",
    );
  });

  it("accepts an explicit rejected outcome with a failed check", () => {
    const review = makeReview(
      context,
      { kind: "harm-safety" },
      "REJECTED",
    );
    expect(parseConstitutionalReview(review, context).outcome).toBe("REJECTED");
  });

  it.each([
    {},
    { ...makeReview(context), outcome: "UNKNOWN" },
    {
      ...makeReview(context),
      principleResults: makeReview(context).principleResults.slice(0, 9),
    },
    {
      ...makeReview(context),
      strategyCompliance: [],
    },
    {
      ...makeReview(context),
      behaviorPlanCompliance: makeReview(context).behaviorPlanCompliance.slice(
        1,
      ),
    },
    {
      ...makeReview(context),
      harmSafety: undefined,
    },
    {
      ...makeReview(context, { kind: "harm-safety" }),
      outcome: "APPROVED",
    },
    {
      ...makeReview(context),
      outcome: "REVISION_REQUIRED",
    },
  ])("rejects incomplete or inconsistent review %#", (review) => {
    expect(() => parseConstitutionalReview(review, context)).toThrow(TypeError);
  });
});
