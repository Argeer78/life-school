import { describe, expect, it } from "vitest";
import {
  behaviorComponentIds,
  isBehaviorComponentId,
  planBehavior,
  type BehaviorPlan,
} from "../../src/steward/behavior-planning.js";
import type { ConversationStrategyId } from "../../src/steward/conversation-strategy-registry.js";
import { constitutionalResolutionOrder } from "../../src/steward/strategy-selection.js";

function plan(
  primaryStrategy: ConversationStrategyId,
  secondaryStrategies: readonly ConversationStrategyId[] = [],
): BehaviorPlan {
  return planBehavior({
    learnerMessage: "A deterministic planning fixture.",
    primaryStrategy,
    secondaryStrategies,
    constitutionalPriorities: constitutionalResolutionOrder,
  });
}

function component(planValue: BehaviorPlan, id: string) {
  return planValue.components.find((entry) => entry.id === id);
}

describe("EN-002 Behavior Planning Engine", () => {
  it("uses a closed registry containing every required behavior component", () => {
    expect(behaviorComponentIds).toEqual([
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
    ]);
  });

  it("derives self-worth and emotion behavior from CS-001 + CS-011", () => {
    const result = plan("CS-001", ["CS-011"]);

    expect(component(result, "acknowledge-experience")?.sourceStrategies).toEqual([
      "CS-001",
      "CS-011",
    ]);
    expect(
      component(result, "ask-reflective-questions")?.sourceStrategies,
    ).toEqual(["CS-001", "CS-011"]);
    expect(component(result, "preserve-responsibility")).toBeDefined();
    expect(component(result, "preserve-freedom")).toBeDefined();
  });

  it("derives decision and uncertainty behavior from CS-002 + CS-003", () => {
    const result = plan("CS-002", ["CS-003"]);

    expect(component(result, "clarify-uncertainty")?.sourceStrategies).toEqual([
      "CS-002",
      "CS-003",
    ]);
    expect(component(result, "ask-reflective-questions")).toBeDefined();
    expect(component(result, "encourage-examination")).toBeDefined();
  });

  it("gives CS-006 safety-priority behavior", () => {
    const result = plan("CS-006");
    const boundary = component(result, "establish-ethical-boundaries");

    expect(boundary).toEqual({
      id: "establish-ethical-boundaries",
      sourceStrategies: ["CS-006"],
      constitutionalPriority: "safety",
    });
    expect(result.components[0]).toEqual(boundary);
    expect(result.conflictResolution.order).toEqual(
      constitutionalResolutionOrder,
    );
  });

  it("gives CS-007 ethical-boundary behavior", () => {
    const result = plan("CS-007");

    expect(component(result, "establish-ethical-boundaries")).toEqual({
      id: "establish-ethical-boundaries",
      sourceStrategies: ["CS-007"],
      constitutionalPriority: "freedom",
    });
    expect(component(result, "encourage-communication")).toBeDefined();
  });

  it("derives learning and curiosity behavior from CS-008 + CS-009", () => {
    const result = plan("CS-008", ["CS-009"]);

    expect(component(result, "answer-directly")?.sourceStrategies).toEqual([
      "CS-008",
    ]);
    expect(component(result, "explain-concepts")?.sourceStrategies).toEqual([
      "CS-008",
      "CS-009",
    ]);
    expect(component(result, "encourage-learning")?.sourceStrategies).toEqual([
      "CS-008",
      "CS-009",
    ]);
    expect(component(result, "ask-reflective-questions")?.sourceStrategies).toEqual([
      "CS-009",
    ]);
  });

  it.each([
    ["CS-001", ["CS-011"]],
    ["CS-002", ["CS-003"]],
    ["CS-006", []],
    ["CS-007", []],
    ["CS-008", ["CS-009"]],
  ] as const)(
    "gives every %s plan component at least one selected source strategy",
    (primary, secondary) => {
      const result = plan(primary, secondary);
      const selected = new Set<ConversationStrategyId>([
        primary,
        ...secondary,
      ]);

      for (const behavior of result.components) {
        expect(behavior.sourceStrategies.length).toBeGreaterThan(0);
        expect(
          behavior.sourceStrategies.every((strategy) => selected.has(strategy)),
        ).toBe(true);
      }
    },
  );

  it("cannot admit free-form unsupported behavior into a plan", () => {
    const result = planBehavior({
      learnerMessage: "Tell me what to do.",
      primaryStrategy: "CS-002",
      secondaryStrategies: [],
      constitutionalPriorities: constitutionalResolutionOrder,
      objectives: ["Command the learner"],
      unsupportedBehavior: "create-dependence",
    } as Parameters<typeof planBehavior>[0] & Record<string, unknown>);

    expect(result.components.every(({ id }) => isBehaviorComponentId(id))).toBe(
      true,
    );
    expect(result).not.toHaveProperty("objectives");
    expect(JSON.stringify(result)).not.toContain("create-dependence");
    expect(JSON.stringify(result)).not.toContain("Command the learner");
  });

  it("is deterministic for identical planning inputs", () => {
    const input = {
      learnerMessage: "Should I move, and can anyone know what will happen?",
      primaryStrategy: "CS-002" as const,
      secondaryStrategies: ["CS-003"] as const,
      constitutionalPriorities: constitutionalResolutionOrder,
    };

    expect(planBehavior(input)).toEqual(planBehavior(input));
  });

  it("rejects a non-constitutional conflict order", () => {
    expect(() =>
      planBehavior({
        learnerMessage: "Help me decide.",
        primaryStrategy: "CS-002",
        secondaryStrategies: [],
        constitutionalPriorities: [
          "freedom",
          "safety",
          "dignity",
          "responsibility",
          "truthful-examination",
        ],
      }),
    ).toThrow(TypeError);
  });
});
