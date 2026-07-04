import type {
  BehaviorComponentId,
  BehaviorPlan,
} from "./behavior-planning.js";
import type { ConversationStrategyId } from "./conversation-strategy-registry.js";
import type {
  BehavioralPrincipleId,
  ConstitutionalReview,
} from "./review-schema.js";
import type { StrategySelection } from "./strategy-selection.js";

export const revisionOutcomes = ["REVISED", "FAILED"] as const;

export const correctionPriority = [
  "HARM_SAFETY",
  "MANIPULATION_COERCION",
  "DIGNITY",
  "FREEDOM",
  "RESPONSIBILITY",
  "TRUTHFUL_EXAMINATION",
  "INTELLECTUAL_HONESTY",
  "CONVERSATIONAL_QUALITY",
] as const;

export type RevisionOutcome = (typeof revisionOutcomes)[number];
export type CorrectionCategory = (typeof correctionPriority)[number];
export type ViolationSource =
  | "harm-safety"
  | BehavioralPrincipleId
  | ConversationStrategyId
  | BehaviorComponentId;

export interface CorrectedViolation {
  readonly source: ViolationSource;
  readonly category: CorrectionCategory;
}

export interface RevisionPreservation {
  readonly learnerMessage: string;
  readonly primaryStrategy: ConversationStrategyId;
  readonly secondaryStrategies: readonly ConversationStrategyId[];
  readonly behaviorComponents: readonly BehaviorComponentId[];
  readonly learnerIntentPreserved: boolean;
  readonly selectedStrategiesPreserved: boolean;
  readonly behaviorPlanObjectivePreserved: boolean;
}

export type RevisionRecord =
  | {
      readonly outcome: "REVISED";
      readonly revisedResponse: string;
      readonly revisionSummary: string;
      readonly correctedViolations: readonly CorrectedViolation[];
      readonly preservation: RevisionPreservation;
    }
  | {
      readonly outcome: "FAILED";
      readonly revisedResponse: null;
      readonly revisionSummary: string;
      readonly correctedViolations: readonly [];
      readonly preservation: RevisionPreservation;
    };

export interface RevisionContext {
  readonly learnerMessage: string;
  readonly strategySelection: StrategySelection;
  readonly plan: BehaviorPlan;
  readonly review: ConstitutionalReview;
}

const outcomeValues = new Set<string>(revisionOutcomes);
const categoryValues = new Set<string>(correctionPriority);
const priorityIndex = new Map(
  correctionPriority.map((category, index) => [category, index]),
);

const principleCategory = {
  "ST-BT-001": "DIGNITY",
  "ST-BT-002": "TRUTHFUL_EXAMINATION",
  "ST-BT-003": "INTELLECTUAL_HONESTY",
  "ST-BT-004": "FREEDOM",
  "ST-BT-005": "DIGNITY",
  "ST-BT-006": "MANIPULATION_COERCION",
  "ST-BT-007": "RESPONSIBILITY",
  "ST-BT-008": "FREEDOM",
  "ST-BT-009": "CONVERSATIONAL_QUALITY",
  "ST-BT-010": "RESPONSIBILITY",
} as const satisfies Record<BehavioralPrincipleId, CorrectionCategory>;

const strategyCategory = {
  "CS-001": "DIGNITY",
  "CS-002": "RESPONSIBILITY",
  "CS-003": "TRUTHFUL_EXAMINATION",
  "CS-004": "DIGNITY",
  "CS-005": "DIGNITY",
  "CS-006": "HARM_SAFETY",
  "CS-007": "MANIPULATION_COERCION",
  "CS-008": "INTELLECTUAL_HONESTY",
  "CS-009": "INTELLECTUAL_HONESTY",
  "CS-010": "DIGNITY",
  "CS-011": "DIGNITY",
  "CS-012": "FREEDOM",
} as const satisfies Record<ConversationStrategyId, CorrectionCategory>;

const behaviorCategory = {
  "acknowledge-experience": "DIGNITY",
  "answer-directly": "CONVERSATIONAL_QUALITY",
  "explain-concepts": "INTELLECTUAL_HONESTY",
  "ask-reflective-questions": "FREEDOM",
  "clarify-uncertainty": "TRUTHFUL_EXAMINATION",
  "establish-ethical-boundaries": "FREEDOM",
  "encourage-learning": "CONVERSATIONAL_QUALITY",
  "encourage-communication": "DIGNITY",
  "encourage-examination": "TRUTHFUL_EXAMINATION",
  "preserve-responsibility": "RESPONSIBILITY",
  "preserve-freedom": "FREEDOM",
} as const satisfies Record<BehaviorComponentId, CorrectionCategory>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function expectedViolations(
  context: RevisionContext,
): Map<ViolationSource, CorrectionCategory> {
  const expected = new Map<ViolationSource, CorrectionCategory>();
  for (const result of context.review.principleResults) {
    if (!result.passes) expected.set(result.testId, principleCategory[result.testId]);
  }
  for (const result of context.review.strategyCompliance) {
    if (!result.passes) {
      expected.set(result.strategyId, strategyCategory[result.strategyId]);
    }
  }
  for (const result of context.review.behaviorPlanCompliance) {
    if (!result.passes) {
      const planComponent = context.plan.components.find(
        ({ id }) => id === result.componentId,
      );
      const category =
        result.componentId === "establish-ethical-boundaries" &&
        planComponent?.sourceStrategies.includes("CS-006")
          ? "HARM_SAFETY"
          : result.componentId === "establish-ethical-boundaries" &&
              planComponent?.sourceStrategies.includes("CS-007")
            ? "MANIPULATION_COERCION"
            : behaviorCategory[result.componentId];
      expected.set(result.componentId, category);
    }
  }
  if (!context.review.harmSafety.passes) {
    expected.set("harm-safety", "HARM_SAFETY");
  }
  return expected;
}

function parsePreservation(
  value: unknown,
  context: RevisionContext,
  requireSemanticChecks: boolean,
): RevisionPreservation {
  if (!isRecord(value)) {
    throw new TypeError("Revision preservation does not match schema.");
  }
  const expectedComponents = context.plan.components.map(({ id }) => id);
  const exact =
    value.learnerMessage === context.learnerMessage &&
    value.primaryStrategy === context.strategySelection.primary &&
    Array.isArray(value.secondaryStrategies) &&
    JSON.stringify(value.secondaryStrategies) ===
      JSON.stringify(context.strategySelection.secondary) &&
    Array.isArray(value.behaviorComponents) &&
    JSON.stringify(value.behaviorComponents) ===
      JSON.stringify(expectedComponents);
  const semanticChecks =
    value.learnerIntentPreserved === true &&
    value.selectedStrategiesPreserved === true &&
    value.behaviorPlanObjectivePreserved === true;

  if (!exact || (requireSemanticChecks && !semanticChecks)) {
    throw new TypeError("Revision does not preserve its constitutional context.");
  }
  if (
    typeof value.learnerIntentPreserved !== "boolean" ||
    typeof value.selectedStrategiesPreserved !== "boolean" ||
    typeof value.behaviorPlanObjectivePreserved !== "boolean"
  ) {
    throw new TypeError("Revision preservation checks must be explicit.");
  }
  return value as unknown as RevisionPreservation;
}

function parseCorrectedViolations(
  value: unknown,
  expected: ReadonlyMap<ViolationSource, CorrectionCategory>,
): CorrectedViolation[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Corrected violations must be an array.");
  }
  const parsed = value.map((entry): CorrectedViolation => {
    if (
      !isRecord(entry) ||
      typeof entry.source !== "string" ||
      !expected.has(entry.source as ViolationSource) ||
      typeof entry.category !== "string" ||
      !categoryValues.has(entry.category)
    ) {
      throw new TypeError("Corrected violation does not match review findings.");
    }
    const source = entry.source as ViolationSource;
    const category = entry.category as CorrectionCategory;
    if (expected.get(source) !== category) {
      throw new TypeError("Corrected violation uses the wrong priority category.");
    }
    return { source, category };
  });
  if (
    parsed.length !== expected.size ||
    new Set(parsed.map(({ source }) => source)).size !== expected.size
  ) {
    throw new TypeError("Every failed review criterion must be corrected once.");
  }
  for (let index = 1; index < parsed.length; index += 1) {
    const previous = priorityIndex.get(parsed[index - 1]!.category) ?? 99;
    const current = priorityIndex.get(parsed[index]!.category) ?? 99;
    if (current < previous) {
      throw new TypeError("Corrected violations are out of priority order.");
    }
  }
  return parsed;
}

export function parseRevisionRecord(
  value: unknown,
  context: RevisionContext,
): RevisionRecord {
  if (
    context.review.outcome !== "REVISION_REQUIRED" ||
    !isRecord(value) ||
    typeof value.outcome !== "string" ||
    !outcomeValues.has(value.outcome) ||
    !isNonEmptyString(value.revisionSummary)
  ) {
    throw new TypeError("Revision record does not match schema.");
  }

  if (value.outcome === "FAILED") {
    if (
      value.revisedResponse !== null ||
      !Array.isArray(value.correctedViolations) ||
      value.correctedViolations.length !== 0
    ) {
      throw new TypeError("A failed revision cannot claim corrections.");
    }
    return {
      outcome: "FAILED",
      revisedResponse: null,
      revisionSummary: value.revisionSummary,
      correctedViolations: [],
      preservation: parsePreservation(value.preservation, context, false),
    };
  }

  if (!isNonEmptyString(value.revisedResponse)) {
    throw new TypeError("A revised response must contain text.");
  }
  const expected = expectedViolations(context);
  return {
    outcome: "REVISED",
    revisedResponse: value.revisedResponse,
    revisionSummary: value.revisionSummary,
    correctedViolations: parseCorrectedViolations(
      value.correctedViolations,
      expected,
    ),
    preservation: parsePreservation(value.preservation, context, true),
  };
}

export function revisionPreservationFor(
  context: RevisionContext,
): RevisionPreservation {
  return {
    learnerMessage: context.learnerMessage,
    primaryStrategy: context.strategySelection.primary,
    secondaryStrategies: [...context.strategySelection.secondary],
    behaviorComponents: context.plan.components.map(({ id }) => id),
    learnerIntentPreserved: true,
    selectedStrategiesPreserved: true,
    behaviorPlanObjectivePreserved: true,
  };
}

export function correctedViolationsFor(
  context: RevisionContext,
): CorrectedViolation[] {
  return [...expectedViolations(context).entries()]
    .map(([source, category]) => ({ source, category }))
    .sort(
      (first, second) =>
        (priorityIndex.get(first.category) ?? 99) -
        (priorityIndex.get(second.category) ?? 99),
    );
}
