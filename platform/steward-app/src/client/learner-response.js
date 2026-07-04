/**
 * Copies only learner-safe fields. Privileged or unexpected response fields
 * are discarded before browser state sees the value.
 *
 * @param {unknown} value
 * @returns {{kind: "accepted" | "fallback", text: string, revisions: 0 | 1}}
 */
export function projectLearnerResponse(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    (value.kind !== "accepted" && value.kind !== "fallback") ||
    !("text" in value) ||
    typeof value.text !== "string" ||
    !("revisions" in value) ||
    (value.revisions !== 0 && value.revisions !== 1)
  ) {
    throw new TypeError("Invalid learner response.");
  }

  return {
    kind: value.kind,
    text: value.text,
    revisions: value.revisions,
  };
}
