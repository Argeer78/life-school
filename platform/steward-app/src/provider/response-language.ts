export const responseLanguages = ["en", "el"] as const;

export type ResponseLanguage = (typeof responseLanguages)[number];
export type DetectedLearnerLanguage = ResponseLanguage | "unknown";

const greekLetter = /\p{Script_Extensions=Greek}/u;
const latinLetter = /\p{Script_Extensions=Latin}/u;

function scriptCounts(message: string): {
  readonly greek: number;
  readonly latin: number;
} {
  let greek = 0;
  let latin = 0;

  for (const character of message) {
    if (greekLetter.test(character)) greek += 1;
    if (latinLetter.test(character)) latin += 1;
  }

  return { greek, latin };
}

/**
 * Detects only the two languages currently supported by Lifeschool.
 * Mixed or letterless input remains unknown instead of guessing.
 */
export function detectLearnerLanguage(
  learnerMessage: string,
): DetectedLearnerLanguage {
  const { greek, latin } = scriptCounts(learnerMessage);

  if (greek > latin) return "el";
  if (latin > greek) return "en";
  return "unknown";
}

/**
 * Unknown input may use the current UI language when supplied by a future
 * caller. English remains the safe default without changing provider inputs.
 */
export function resolveResponseLanguage(
  learnerMessage: string,
  fallback: ResponseLanguage = "en",
): ResponseLanguage {
  const detected = detectLearnerLanguage(learnerMessage);
  return detected === "unknown" ? fallback : detected;
}
