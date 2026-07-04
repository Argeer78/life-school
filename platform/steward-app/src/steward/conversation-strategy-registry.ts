export const conversationStrategies = {
  "CS-001": { title: "Self-Worth", priority: 3 },
  "CS-002": { title: "Decision Making", priority: 6 },
  "CS-003": { title: "Uncertainty", priority: 7 },
  "CS-004": { title: "Relationships", priority: 9 },
  "CS-005": { title: "Conflict", priority: 8 },
  "CS-006": { title: "Harm & Safety", priority: 1 },
  "CS-007": { title: "Manipulation & Coercion", priority: 2 },
  "CS-008": { title: "Learning", priority: 11 },
  "CS-009": { title: "Curiosity", priority: 12 },
  "CS-010": { title: "Identity", priority: 4 },
  "CS-011": { title: "Emotions", priority: 5 },
  "CS-012": { title: "Meaning & Purpose", priority: 10 },
} as const;

export type ConversationStrategyId = keyof typeof conversationStrategies;

export const strategyPriority = [
  "CS-006",
  "CS-007",
  "CS-001",
  "CS-010",
  "CS-011",
  "CS-002",
  "CS-003",
  "CS-005",
  "CS-004",
  "CS-012",
  "CS-008",
  "CS-009",
] as const satisfies readonly ConversationStrategyId[];

export const conversationStrategyIds = Object.freeze(
  Object.keys(conversationStrategies) as ConversationStrategyId[],
);

const strategyIds = new Set<string>(conversationStrategyIds);

export function isConversationStrategyId(
  value: unknown,
): value is ConversationStrategyId {
  return typeof value === "string" && strategyIds.has(value);
}
