import type { ReviewRequest } from "../../src/model/client.js";
import {
  behavioralPrincipleIds,
  type BehavioralPrincipleId,
  type ConstitutionalReview,
  type ConstitutionalReviewContext,
  type ReviewOutcome,
} from "../../src/steward/review-schema.js";
import type { BehaviorComponentId } from "../../src/steward/behavior-planning.js";
import type { ConversationStrategyId } from "../../src/steward/conversation-strategy-registry.js";

export type ReviewFailure =
  | { readonly kind: "principle"; readonly id: BehavioralPrincipleId }
  | { readonly kind: "strategy"; readonly id: ConversationStrategyId }
  | { readonly kind: "behavior"; readonly id: BehaviorComponentId }
  | { readonly kind: "harm-safety" };

function result(passes: boolean) {
  return passes
    ? {
        passes: true as const,
        reason: "The candidate satisfies this review criterion.",
        revisionRequirement: null,
      }
    : {
        passes: false as const,
        reason: "The candidate violates this review criterion.",
        revisionRequirement: "Revise the candidate to satisfy this criterion.",
      };
}

export function makeReview(
  context: ConstitutionalReviewContext,
  failure?: ReviewFailure,
  outcome: ReviewOutcome = failure === undefined
    ? "APPROVED"
    : "REVISION_REQUIRED",
): ConstitutionalReview {
  const strategies = [
    context.strategySelection.primary,
    ...context.strategySelection.secondary,
  ];

  return {
    outcome,
    principleResults: behavioralPrincipleIds.map((testId) => ({
      testId,
      ...result(!(failure?.kind === "principle" && failure.id === testId)),
    })),
    strategyCompliance: strategies.map((strategyId) => ({
      strategyId,
      ...result(!(failure?.kind === "strategy" && failure.id === strategyId)),
    })),
    behaviorPlanCompliance: context.plan.components.map(({ id: componentId }) => ({
      componentId,
      ...result(!(failure?.kind === "behavior" && failure.id === componentId)),
    })),
    harmSafety: result(failure?.kind !== "harm-safety"),
  };
}

export function passingReview(request: ReviewRequest): ConstitutionalReview {
  return makeReview(request);
}

export function failingReview(
  failure: ReviewFailure,
  outcome: Exclude<ReviewOutcome, "APPROVED"> = "REVISION_REQUIRED",
): (request: ReviewRequest) => ConstitutionalReview {
  return (request) => makeReview(request, failure, outcome);
}
