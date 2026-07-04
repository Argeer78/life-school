import type { ConstitutionalReview } from "./review-schema.js";

const asciiLetter = /[A-Za-z]/;
const unicodeLetter = /\p{Letter}/u;
const latinLetter = /\p{Script_Extensions=Latin}/u;

function letterCounts(text: string): {
  readonly ascii: number;
  readonly unexpected: number;
} {
  let ascii = 0;
  let unexpected = 0;
  for (const character of text) {
    if (asciiLetter.test(character)) ascii += 1;
    if (unicodeLetter.test(character) && !latinLetter.test(character)) {
      unexpected += 1;
    }
  }
  return { ascii, unexpected };
}

/**
 * Detects unintended script mixing conservatively. It applies only when the
 * learner wrote an English, Latin-script message and the response is likewise
 * predominantly Latin-script but contains letters from another script.
 */
export function hasUnexpectedLanguageMixing(
  learnerMessage: string,
  response: string,
): boolean {
  const learner = letterCounts(learnerMessage);
  const candidate = letterCounts(response);
  const learnerIsEnglishScript =
    learner.ascii >= 8 && learner.unexpected === 0;
  const responseIsPredominantlyEnglishScript = candidate.ascii >= 20;

  return (
    learnerIsEnglishScript &&
    responseIsPredominantlyEnglishScript &&
    candidate.unexpected > 0
  );
}

export function requireLanguageConsistencyRevision(
  review: ConstitutionalReview,
  learnerMessage: string,
  response: string,
): ConstitutionalReview {
  if (!hasUnexpectedLanguageMixing(learnerMessage, response)) return review;

  return {
    ...review,
    outcome:
      review.outcome === "REJECTED" ? "REJECTED" : "REVISION_REQUIRED",
    principleResults: review.principleResults.map((result) =>
      result.testId === "ST-BT-009"
        ? {
            testId: result.testId,
            passes: false,
            reason:
              "The English response contains unintended mixed-language text.",
            revisionRequirement:
              "Remove the unintended non-English text while preserving meaning.",
          }
        : result,
    ),
  };
}
