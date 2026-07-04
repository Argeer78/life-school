import type {
  BehaviorComponentId,
  BehaviorPlan,
} from "./behavior-planning.js";
import type { ConversationStrategyId } from "./conversation-strategy-registry.js";
import type { StrategySelection } from "./strategy-selection.js";

export const behavioralPrincipleIds = [
  "ST-BT-001",
  "ST-BT-002",
  "ST-BT-003",
  "ST-BT-004",
  "ST-BT-005",
  "ST-BT-006",
  "ST-BT-007",
  "ST-BT-008",
  "ST-BT-009",
  "ST-BT-010",
] as const;

export const reviewOutcomes = [
  "APPROVED",
  "REVISION_REQUIRED",
  "REJECTED",
] as const;

export type BehavioralPrincipleId = (typeof behavioralPrincipleIds)[number];
export type ReviewOutcome = (typeof reviewOutcomes)[number];

export type ComplianceResult<IdKey extends string, IdValue extends string> =
  | ({
      readonly passes: true;
      readonly reason: string;
      readonly revisionRequirement: null;
    } & Readonly<Record<IdKey, IdValue>>)
  | ({
      readonly passes: false;
      readonly reason: string;
      readonly revisionRequirement: string;
    } & Readonly<Record<IdKey, IdValue>>);

export type PrincipleReviewResult = ComplianceResult<
  "testId",
  BehavioralPrincipleId
>;
export type StrategyComplianceResult = ComplianceResult<
  "strategyId",
  ConversationStrategyId
>;
export type BehaviorComplianceResult = ComplianceResult<
  "componentId",
  BehaviorComponentId
>;

export type HarmSafetyReview =
  | {
      readonly passes: true;
      readonly reason: string;
      readonly revisionRequirement: null;
    }
  | {
      readonly passes: false;
      readonly reason: string;
      readonly revisionRequirement: string;
    };

export interface ConstitutionalReview {
  readonly outcome: ReviewOutcome;
  readonly principleResults: readonly PrincipleReviewResult[];
  readonly strategyCompliance: readonly StrategyComplianceResult[];
  readonly behaviorPlanCompliance: readonly BehaviorComplianceResult[];
  readonly harmSafety: HarmSafetyReview;
}

export interface ConstitutionalReviewContext {
  readonly strategySelection: StrategySelection;
  readonly plan: BehaviorPlan;
}

const principleIds = new Set<string>(behavioralPrincipleIds);
const outcomeValues = new Set<string>(reviewOutcomes);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateComplianceFields(value: Record<string, unknown>): void {
  if (
    typeof value.passes !== "boolean" ||
    !isNonEmptyString(value.reason) ||
    (value.passes
      ? value.revisionRequirement !== null
      : !isNonEmptyString(value.revisionRequirement))
  ) {
    throw new TypeError("Compliance result does not match schema.");
  }
}

function parsePrincipleResult(value: unknown): PrincipleReviewResult {
  if (
    !isRecord(value) ||
    typeof value.testId !== "string" ||
    !principleIds.has(value.testId)
  ) {
    throw new TypeError("Principle review result does not match schema.");
  }
  validateComplianceFields(value);
  return value as unknown as PrincipleReviewResult;
}

function parseStrategyResult(
  value: unknown,
  selected: ReadonlySet<string>,
): StrategyComplianceResult {
  if (
    !isRecord(value) ||
    typeof value.strategyId !== "string" ||
    !selected.has(value.strategyId)
  ) {
    throw new TypeError("Strategy compliance result does not match selection.");
  }
  validateComplianceFields(value);
  return value as unknown as StrategyComplianceResult;
}

function parseBehaviorResult(
  value: unknown,
  planned: ReadonlySet<string>,
): BehaviorComplianceResult {
  if (
    !isRecord(value) ||
    typeof value.componentId !== "string" ||
    !planned.has(value.componentId)
  ) {
    throw new TypeError("Behavior compliance result does not match the plan.");
  }
  validateComplianceFields(value);
  return value as unknown as BehaviorComplianceResult;
}

function parseHarmSafety(value: unknown): HarmSafetyReview {
  if (!isRecord(value)) {
    throw new TypeError("Harm and safety review does not match schema.");
  }
  validateComplianceFields(value);
  return value as unknown as HarmSafetyReview;
}

function validateExactIds(
  actualIds: readonly string[],
  expectedIds: readonly string[],
  label: string,
): void {
  const actual = new Set(actualIds);
  const expected = new Set(expectedIds);
  if (
    actual.size !== expected.size ||
    actualIds.length !== expectedIds.length ||
    !expectedIds.every((id) => actual.has(id))
  ) {
    throw new TypeError(`Review must check every ${label} exactly once.`);
  }
}

export function parseConstitutionalReview(
  value: unknown,
  context: ConstitutionalReviewContext,
): ConstitutionalReview {
  if (
    !isRecord(value) ||
    typeof value.outcome !== "string" ||
    !outcomeValues.has(value.outcome) ||
    !Array.isArray(value.principleResults) ||
    !Array.isArray(value.strategyCompliance) ||
    !Array.isArray(value.behaviorPlanCompliance)
  ) {
    throw new TypeError("Constitutional review does not match schema.");
  }

  const selectedStrategies = [
    context.strategySelection.primary,
    ...context.strategySelection.secondary,
  ];
  const plannedComponents = context.plan.components.map(({ id }) => id);
  const selectedSet = new Set<string>(selectedStrategies);
  const plannedSet = new Set<string>(plannedComponents);

  const principleResults = value.principleResults.map(parsePrincipleResult);
  const strategyCompliance = value.strategyCompliance.map((result) =>
    parseStrategyResult(result, selectedSet),
  );
  const behaviorPlanCompliance = value.behaviorPlanCompliance.map((result) =>
    parseBehaviorResult(result, plannedSet),
  );
  const harmSafety = parseHarmSafety(value.harmSafety);

  validateExactIds(
    principleResults.map(({ testId }) => testId),
    behavioralPrincipleIds,
    "behavioral principle",
  );
  validateExactIds(
    strategyCompliance.map(({ strategyId }) => strategyId),
    selectedStrategies,
    "selected strategy",
  );
  validateExactIds(
    behaviorPlanCompliance.map(({ componentId }) => componentId),
    plannedComponents,
    "planned behavior component",
  );

  const allPass = [
    ...principleResults,
    ...strategyCompliance,
    ...behaviorPlanCompliance,
    harmSafety,
  ].every((result) => result.passes);

  if (value.outcome === "APPROVED" && !allPass) {
    throw new TypeError("An approved review cannot contain failed checks.");
  }
  if (value.outcome !== "APPROVED" && allPass) {
    throw new TypeError("A non-approved review must contain a failed check.");
  }

  return {
    outcome: value.outcome as ReviewOutcome,
    principleResults,
    strategyCompliance,
    behaviorPlanCompliance,
    harmSafety,
  };
}
