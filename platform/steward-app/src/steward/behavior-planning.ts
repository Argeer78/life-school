import {
  isConversationStrategyId,
  type ConversationStrategyId,
} from "./conversation-strategy-registry.js";
import {
  constitutionalResolutionOrder,
  type ConstitutionalResolutionPrinciple,
  type StrategySelection,
} from "./strategy-selection.js";

export const behaviorComponentIds = [
  "acknowledge-experience",
  "answer-directly",
  "explain-concepts",
  "ask-reflective-questions",
  "clarify-uncertainty",
  "establish-ethical-boundaries",
  "encourage-learning",
  "encourage-communication",
  "encourage-examination",
  "preserve-responsibility",
  "preserve-freedom",
] as const;

export type BehaviorComponentId = (typeof behaviorComponentIds)[number];

export interface BehaviorComponent {
  readonly id: BehaviorComponentId;
  readonly sourceStrategies: readonly ConversationStrategyId[];
  readonly constitutionalPriority: ConstitutionalResolutionPrinciple;
}

export interface ResolvedBehaviorConflict {
  readonly suppressedComponent: BehaviorComponentId;
  readonly prevailingComponent: BehaviorComponentId;
  readonly constitutionalPriority: ConstitutionalResolutionPrinciple;
  readonly sourceStrategies: readonly ConversationStrategyId[];
}

export interface BehaviorPlan {
  readonly primaryStrategy: ConversationStrategyId;
  readonly secondaryStrategies: readonly ConversationStrategyId[];
  readonly components: readonly BehaviorComponent[];
  readonly conflictResolution: {
    readonly order: readonly ConstitutionalResolutionPrinciple[];
    readonly resolved: readonly ResolvedBehaviorConflict[];
  };
}

export interface BehaviorPlanningInput {
  readonly learnerMessage: string;
  readonly primaryStrategy: ConversationStrategyId;
  readonly secondaryStrategies: readonly ConversationStrategyId[];
  readonly constitutionalPriorities: readonly ConstitutionalResolutionPrinciple[];
}

const componentPriority = {
  "acknowledge-experience": "dignity",
  "answer-directly": "truthful-examination",
  "explain-concepts": "truthful-examination",
  "ask-reflective-questions": "freedom",
  "clarify-uncertainty": "truthful-examination",
  "establish-ethical-boundaries": "freedom",
  "encourage-learning": "truthful-examination",
  "encourage-communication": "dignity",
  "encourage-examination": "truthful-examination",
  "preserve-responsibility": "responsibility",
  "preserve-freedom": "freedom",
} as const satisfies Record<
  BehaviorComponentId,
  ConstitutionalResolutionPrinciple
>;

const componentsByStrategy = {
  "CS-001": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-002": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "clarify-uncertainty",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-003": [
    "clarify-uncertainty",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-004": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "encourage-communication",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-005": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "encourage-communication",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-006": [
    "acknowledge-experience",
    "establish-ethical-boundaries",
    "encourage-communication",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-007": [
    "establish-ethical-boundaries",
    "encourage-communication",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-008": [
    "answer-directly",
    "explain-concepts",
    "encourage-learning",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-009": [
    "explain-concepts",
    "ask-reflective-questions",
    "clarify-uncertainty",
    "encourage-learning",
    "encourage-examination",
    "preserve-freedom",
  ],
  "CS-010": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-011": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
  "CS-012": [
    "acknowledge-experience",
    "ask-reflective-questions",
    "encourage-learning",
    "encourage-examination",
    "preserve-responsibility",
    "preserve-freedom",
  ],
} as const satisfies Record<
  ConversationStrategyId,
  readonly BehaviorComponentId[]
>;

const componentOrder = new Map(
  behaviorComponentIds.map((component, index) => [component, index]),
);

export function isBehaviorComponentId(
  value: unknown,
): value is BehaviorComponentId {
  return (
    typeof value === "string" &&
    behaviorComponentIds.includes(value as BehaviorComponentId)
  );
}

function validateInput(input: BehaviorPlanningInput): void {
  if (!isConversationStrategyId(input.primaryStrategy)) {
    throw new TypeError("Behavior planning requires a registered primary strategy.");
  }
  if (
    new Set(input.secondaryStrategies).size !== input.secondaryStrategies.length ||
    input.secondaryStrategies.includes(input.primaryStrategy) ||
    !input.secondaryStrategies.every(isConversationStrategyId)
  ) {
    throw new TypeError("Behavior planning received invalid secondary strategies.");
  }
  if (
    input.constitutionalPriorities.length !==
      constitutionalResolutionOrder.length ||
    !input.constitutionalPriorities.every(
      (priority, index) => priority === constitutionalResolutionOrder[index],
    )
  ) {
    throw new TypeError(
      "Behavior planning requires the constitutional conflict order.",
    );
  }
}

export function planBehavior(input: BehaviorPlanningInput): BehaviorPlan {
  validateInput(input);
  const strategies = [input.primaryStrategy, ...input.secondaryStrategies];
  const sourcesByComponent = new Map<
    BehaviorComponentId,
    ConversationStrategyId[]
  >();

  for (const strategy of strategies) {
    for (const component of componentsByStrategy[strategy]) {
      const sources = sourcesByComponent.get(component) ?? [];
      sources.push(strategy);
      sourcesByComponent.set(component, sources);
    }
  }

  const resolved: ResolvedBehaviorConflict[] = [];
  if (
    sourcesByComponent.has("establish-ethical-boundaries") &&
    sourcesByComponent.has("answer-directly")
  ) {
    const boundarySources =
      sourcesByComponent.get("establish-ethical-boundaries") ?? [];
    const safetyPrevails = boundarySources.includes("CS-006");
    sourcesByComponent.delete("answer-directly");
    resolved.push({
      suppressedComponent: "answer-directly",
      prevailingComponent: "establish-ethical-boundaries",
      constitutionalPriority: safetyPrevails ? "safety" : "freedom",
      sourceStrategies: [...boundarySources],
    });
  }

  const priorityIndex = new Map(
    input.constitutionalPriorities.map((priority, index) => [priority, index]),
  );
  const components = [...sourcesByComponent.entries()]
    .map(
      ([id, sourceStrategies]): BehaviorComponent => ({
        id,
        sourceStrategies,
        constitutionalPriority:
          id === "establish-ethical-boundaries" &&
          sourceStrategies.includes("CS-006")
            ? "safety"
            : componentPriority[id],
      }),
    )
    .sort((first, second) => {
      const constitutionalDifference =
        (priorityIndex.get(first.constitutionalPriority) ?? 99) -
        (priorityIndex.get(second.constitutionalPriority) ?? 99);
      return (
        constitutionalDifference ||
        (componentOrder.get(first.id) ?? 99) -
          (componentOrder.get(second.id) ?? 99)
      );
    });

  return {
    primaryStrategy: input.primaryStrategy,
    secondaryStrategies: [...input.secondaryStrategies],
    components,
    conflictResolution: {
      order: [...input.constitutionalPriorities],
      resolved,
    },
  };
}

export function planFromStrategySelection(
  learnerMessage: string,
  selection: StrategySelection,
): BehaviorPlan {
  return planBehavior({
    learnerMessage,
    primaryStrategy: selection.primary,
    secondaryStrategies: selection.secondary,
    constitutionalPriorities:
      selection.constitutionalJustification.resolutionOrder,
  });
}
