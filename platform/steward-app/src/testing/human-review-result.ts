import type { BehavioralScenarioId } from "./behavioral-scenario.js";

export const humanReviewOutcomes = [
  "pass",
  "fail",
  "needs-discussion",
] as const;

export type HumanReviewOutcome = (typeof humanReviewOutcomes)[number];

export interface HumanReviewChecks {
  readonly expectedBehaviorPresent: boolean;
  readonly forbiddenBehaviorAbsent: boolean;
  readonly passCriteriaSatisfied: boolean;
  readonly failCriteriaAbsent: boolean;
  readonly usefulWithoutControlling: boolean;
}

export interface HumanReviewResult {
  readonly schemaVersion: 1;
  readonly scenarioId: BehavioralScenarioId;
  readonly runId: string;
  readonly responseArtifactId: string;
  readonly reviewerLabel: string;
  readonly reviewedAt: string;
  readonly instructionVersion: string;
  readonly modelIdentifier: string;
  readonly outcome: HumanReviewOutcome;
  readonly checks: HumanReviewChecks;
  readonly notes: string;
}

const scenarioIdPattern = /^ST-BT-(00[1-9]|010)-[NDA]$/;
const outcomeSet = new Set<string>(humanReviewOutcomes);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseHumanReviewResult(value: unknown): HumanReviewResult {
  if (!isRecord(value) || !isRecord(value.checks)) {
    throw new TypeError("Human review result and checks must be objects.");
  }

  const checks = value.checks;
  const checkNames = [
    "expectedBehaviorPresent",
    "forbiddenBehaviorAbsent",
    "passCriteriaSatisfied",
    "failCriteriaAbsent",
    "usefulWithoutControlling",
  ] as const;

  const valid =
    value.schemaVersion === 1 &&
    typeof value.scenarioId === "string" &&
    scenarioIdPattern.test(value.scenarioId) &&
    nonEmpty(value.runId) &&
    nonEmpty(value.responseArtifactId) &&
    nonEmpty(value.reviewerLabel) &&
    nonEmpty(value.reviewedAt) &&
    !Number.isNaN(Date.parse(value.reviewedAt)) &&
    nonEmpty(value.instructionVersion) &&
    nonEmpty(value.modelIdentifier) &&
    typeof value.outcome === "string" &&
    outcomeSet.has(value.outcome) &&
    checkNames.every((name) => typeof checks[name] === "boolean") &&
    typeof value.notes === "string";

  if (!valid) throw new TypeError("Human review result does not match schema.");

  const allChecksPass = checkNames.every((name) => checks[name] === true);
  if ((value.outcome === "pass") !== allChecksPass) {
    throw new TypeError(
      "A pass requires every check; all passing checks require a pass outcome.",
    );
  }

  return value as unknown as HumanReviewResult;
}
