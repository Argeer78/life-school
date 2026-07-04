import type { ReviseRequest } from "../../src/model/client.js";
import {
  correctedViolationsFor,
  revisionPreservationFor,
  type RevisionRecord,
} from "../../src/steward/revision-schema.js";

export function successfulRevision(
  revisedResponse: string,
  revisionSummary?: string,
): (request: ReviseRequest) => RevisionRecord {
  return (request) => {
    const context = {
      learnerMessage: request.userPrompt,
      strategySelection: request.strategySelection,
      plan: request.plan,
      review: request.review,
    };
    const correctedViolations = correctedViolationsFor(context);
    const categories = [
      ...new Set(
        correctedViolations.map(({ category }) =>
          category.toLowerCase().replaceAll("_", " "),
        ),
      ),
    ];
    return {
      outcome: "REVISED",
      revisedResponse,
      revisionSummary:
        revisionSummary ??
        `Corrected ${categories.join(", ")} while preserving the original request.`,
      correctedViolations,
      preservation: revisionPreservationFor(context),
    };
  };
}

export function failedRevision(
  revisionSummary = "The candidate could not be revised constitutionally.",
): (request: ReviseRequest) => RevisionRecord {
  return (request) => ({
    outcome: "FAILED",
    revisedResponse: null,
    revisionSummary,
    correctedViolations: [],
    preservation: revisionPreservationFor({
      learnerMessage: request.userPrompt,
      strategySelection: request.strategySelection,
      plan: request.plan,
      review: request.review,
    }),
  });
}
