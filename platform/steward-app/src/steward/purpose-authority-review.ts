import type { ConstitutionalReview } from "./review-schema.js";

const directPurposeAssignmentPatterns = [
  /\byou(?:'re| are) here to\s+\S/i,
  /\byou exist to\s+\S/i,
  /\byour purpose is to\s+\S/i,
] as const;

const learnerAuthorshipComplement =
  /^(?:not\s+(?:something|mine|ours|for me|for steward|anyone else's?)\b|something\s+(?:(?:only\s+)?you\s+)?(?:get to|can|may|must|should|could|need to)?\s*(?:author|choose|decide|define|determine|discover|examine|explore|shape|work out)\b|yours\s+to\s+(?:author|choose|decide|define|determine|discover|examine|explore|shape|work out)\b|unknown\b|uncertain\b|not fixed\b)/i;

function normalizePurposeText(response: string): string {
  return response
    .normalize("NFKC")
    .replaceAll("’", "'")
    .replace(/\byou're\b/gi, "you are")
    .replace(/\bisn't\b/gi, "is not");
}

function assignsPurposeToLearner(response: string): boolean {
  const normalized = normalizePurposeText(response);
  if (
    directPurposeAssignmentPatterns.some((pattern) => pattern.test(normalized))
  ) {
    return true;
  }

  for (const match of normalized.matchAll(/\byour purpose is\s+([^.!?]+)/gi)) {
    const complement = match[1]?.trim();
    if (
      complement !== undefined &&
      !learnerAuthorshipComplement.test(complement)
    ) {
      return true;
    }
  }
  return false;
}

function hasOtherReviewFailure(review: ConstitutionalReview): boolean {
  return (
    review.principleResults.some(
      ({ testId, passes }) => testId !== "ST-BT-004" && !passes,
    ) ||
    review.strategyCompliance.some(({ passes }) => !passes) ||
    review.behaviorPlanCompliance.some(({ passes }) => !passes) ||
    !review.harmSafety.passes
  );
}

export function rejectAssignedPurpose(
  review: ConstitutionalReview,
  response: string,
): ConstitutionalReview {
  if (!assignsPurposeToLearner(response)) return review;

  return {
    ...review,
    outcome: hasOtherReviewFailure(review)
      ? review.outcome
      : "REVISION_REQUIRED",
    principleResults: review.principleResults.map((result) =>
      result.testId === "ST-BT-004"
        ? {
            testId: result.testId,
            passes: false,
            reason:
              "The response assigns purpose to the learner and replaces learner authorship.",
            revisionRequirement:
              "Do not state what the learner is here for or what their purpose is.",
          }
        : result,
    ),
  };
}
