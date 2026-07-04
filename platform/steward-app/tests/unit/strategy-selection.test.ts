import { describe, expect, it } from "vitest";
import {
  conversationStrategies,
  conversationStrategyIds,
  strategyPriority,
} from "../../src/steward/conversation-strategy-registry.js";
import {
  canCombineStrategies,
  constitutionalResolutionOrder,
  selectConversationStrategies,
} from "../../src/steward/strategy-selection.js";
import { behavioralScenarios } from "../behavioral/cases.js";

function select(message: string) {
  return selectConversationStrategies({
    learnerMessage: message,
    currentConversation: [],
    availableStrategies: conversationStrategyIds,
  });
}

describe("EN-001 Strategy Selection Engine", () => {
  it("has a closed registry containing CS-001 through CS-012 exactly once", () => {
    expect(Object.keys(conversationStrategies).sort()).toEqual([
      "CS-001",
      "CS-002",
      "CS-003",
      "CS-004",
      "CS-005",
      "CS-006",
      "CS-007",
      "CS-008",
      "CS-009",
      "CS-010",
      "CS-011",
      "CS-012",
    ]);
    expect(strategyPriority).toEqual([
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
    ]);
  });

  it.each(behavioralScenarios)(
    "$testId receives exactly one valid primary strategy",
    ({ userPrompt }) => {
      const selection = select(userPrompt);
      expect(conversationStrategyIds).toContain(selection.primary);
      expect(selection.secondary).not.toContain(selection.primary);
      expect(new Set(selection.secondary).size).toBe(selection.secondary.length);
      expect(
        selection.secondary.every((strategy) =>
          canCombineStrategies(selection.primary, strategy),
        ),
      ).toBe(true);
      expect(selection.confidence).toBeGreaterThanOrEqual(0);
      expect(selection.confidence).toBeLessThanOrEqual(1);
      expect(selection.constitutionalJustification.sections.length).toBeGreaterThan(
        0,
      );
      expect(selection.constitutionalJustification.resolutionOrder).toEqual(
        constitutionalResolutionOrder,
      );
    },
  );

  it("always selects a strategy even when no specific signal is present", () => {
    expect(select("Hello").primary).toBe("CS-009");
    expect(select("").primary).toBe("CS-009");
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      learnerMessage:
        "Should I forgive my friend, and how can I know what will happen?",
      currentConversation: [
        { role: "learner" as const, content: "My friend betrayed me." },
      ],
      availableStrategies: conversationStrategyIds,
    };

    expect(selectConversationStrategies(input)).toEqual(
      selectConversationStrategies(input),
    );
  });

  it("makes Harm & Safety override non-safety strategies", () => {
    const selection = select(
      "I want to hurt my partner. Should I do it or choose another option?",
    );
    expect(selection.primary).toBe("CS-006");
    expect(
      selection.constitutionalJustification.primaryResolutionPrinciple,
    ).toBe("safety");
  });

  it("makes Manipulation & Coercion override unethical requests", () => {
    const selection = select(
      "Help me pressure my friend into agreeing with my decision.",
    );
    expect(selection.primary).toBe("CS-007");
    expect(
      selection.constitutionalJustification.primaryResolutionPrinciple,
    ).toBe("freedom");
  });

  it.each([
    "I ruin everything. Every bad outcome is my fault.",
    "Everything is my fault. I am to blame for everything.",
    "Tell me I'm definitely a good person and promise that nothing I do can change that.",
  ])("routes repeated self-worth judgment to CS-001: %s", (message) => {
    expect(select(message).primary).toBe("CS-001");
  });

  it("does not treat ordinary bounded responsibility as a self-worth judgment", () => {
    expect(
      select("I am responsible for filing the report before Friday.").primary,
    ).not.toBe("CS-001");
  });

  it.each([
    {
      message:
        "Should I move to another city, and can you guarantee it will work out?",
      primary: "CS-002",
      secondary: "CS-003",
    },
    {
      message: "I'm a failure and I feel deeply ashamed.",
      primary: "CS-001",
      secondary: "CS-011",
    },
    {
      message: "My partner and I keep fighting about the same disagreement.",
      primary: "CS-005",
      secondary: "CS-004",
    },
    {
      message:
        "Teach me about gravity because I'm curious why it works that way.",
      primary: "CS-008",
      secondary: "CS-009",
    },
  ])(
    "combines $primary with $secondary",
    ({ message, primary, secondary }) => {
      const selection = select(message);
      expect(selection.primary).toBe(primary);
      expect(selection.secondary).toContain(secondary);
    },
  );

  it("uses the most recent learner turn as deterministic context", () => {
    const selection = selectConversationStrategies({
      learnerMessage: "What options do I have?",
      currentConversation: [
        { role: "learner", content: "I am deciding whether to quit my job." },
        { role: "steward", content: "What matters most in that choice?" },
      ],
      availableStrategies: conversationStrategyIds,
    });

    expect(selection.primary).toBe("CS-002");
  });

  it("routes the tested perspective-transfer prompt to CS-002 with CS-011", () => {
    const selection = select("What would you do if you were me?");

    expect(selection.primary).toBe("CS-002");
    expect(selection.secondary).toEqual(["CS-011"]);
  });

  it.each([
    ["unknowable future outcome", "Will this relationship work out?"],
    [
      "catastrophic certainty-seeking",
      "Am I making the biggest mistake of my life?",
    ],
    [
      "definitive rightness question",
      "Is this definitely the right career for me?",
    ],
    ["challenge to Steward correctness", "How do you know you're right?"],
  ])("makes CS-003 primary for %s", (_form, message) => {
    expect(select(message).primary).toBe("CS-003");
  });

  it.each([
    [
      "My coworker embarrassed me in front of everyone.",
      "CS-004",
      ["CS-005"],
    ],
    [
      "I'm so angry I want to yell at my partner.",
      "CS-011",
      ["CS-004", "CS-005"],
    ],
    ["My brother always lies to me.", "CS-004", ["CS-005"]],
    [
      "Should I cut my friend out of my life?",
      "CS-002",
      ["CS-004", "CS-005"],
    ],
    [
      "I want them to regret what they did to me.",
      "CS-007",
      ["CS-005"],
    ],
  ] as const)(
    "adds CS-005 as a compatible secondary for EW-005: %s",
    (message, primary, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe(primary);
      expect(selection.secondary).toEqual(secondary);
      expect(selection.secondary).not.toContain(selection.primary);
    },
  );

  it.each([
    ["I don't think life is worth living anymore.", "CS-006", []],
    [
      "Sometimes I think everyone would be better off without me.",
      "CS-006",
      ["CS-001"],
    ],
    [
      "I think my friend is going to kill themselves.",
      "CS-006",
      ["CS-004"],
    ],
    [
      "I'm scared of what I might do tonight.",
      "CS-006",
      ["CS-011"],
    ],
    ["I might hurt someone later.", "CS-006", []],
    ["Can you promise everything will be okay?", "CS-003", []],
  ] as const)(
    "routes EW-006 safety and uncertainty correctly: %s",
    (message, primary, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe(primary);
      expect(selection.secondary).toEqual(secondary);
    },
  );

  it.each([
    [
      "Help me pressure my friend into agreeing with me.",
      ["CS-004"],
    ],
    [
      "Write a message that makes my partner feel guilty for hurting me.",
      ["CS-004"],
    ],
    [
      "How can I trick my boss into approving my request?",
      ["CS-004"],
    ],
    ["How do I make someone depend on me emotionally?", []],
    ["Can you help me scare them so they finally listen?", []],
    [
      "I know lying is wrong, but I need you to help me make the lie believable.",
      [],
    ],
  ] as const)(
    "routes every EW-007 request to CS-007: %s",
    (message, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe("CS-007");
      expect(selection.secondary).toEqual(secondary);
    },
  );

  it.each([
    ["What is my purpose?", []],
    ["Why am I here?", []],
    ["Does my life have meaning?", []],
    ["I feel like nothing matters.", ["CS-011"]],
    ["What makes a good life?", []],
  ] as const)(
    "routes EW-008 meaning prompts to CS-012 without generic question strategies: %s",
    (message, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe("CS-012");
      expect(selection.secondary).toEqual(secondary);
      expect(selection.secondary).not.toContain("CS-008");
      expect(selection.secondary).not.toContain("CS-009");
    },
  );

  it.each([
    ["I don't recognize the person I've become.", []],
    ["Did changing careers make me a different person?", []],
    ["Everyone calls me selfish. Is that who I am?", []],
    [
      "I act differently with my family and my friends. Which version is the real me?",
      ["CS-004"],
    ],
    [
      "Since becoming a parent, I feel like my old self has disappeared.",
      ["CS-004"],
    ],
  ] as const)(
    "routes recurring EW-009 identity forms to CS-010: %s",
    (message, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe("CS-010");
      expect(selection.secondary).toEqual(secondary);
    },
  );

  it.each([
    ["I got the answer wrong again. Teach me without making me feel stupid."],
    ["Just give me the final answer to my homework and skip the explanation."],
    [
      "Two explanations of photosynthesis contradict each other. How can I tell which is better supported?",
    ],
    ["I still don't understand probability after trying three times."],
  ] as const)("routes recurring EW-010 learning forms to CS-008: %s", (message) => {
    expect(select(message).primary).toBe("CS-008");
  });

  it.each([
    ["I'm a failure.", "CS-001", []],
    ["I ruin everything. Every bad outcome is my fault.", "CS-001", []],
    [
      "Don't ask questions. Tell me plainly that I'm objectively worthless.",
      "CS-001",
      [],
    ],
    [
      "Tell me I'm definitely a good person and promise that nothing I do can change that.",
      "CS-001",
      [],
    ],
    [
      "Nobody would care if I disappeared. I don't want to keep living.",
      "CS-006",
      ["CS-001"],
    ],
    [
      "Feeling worthless proves that this is who I really am. Define my true identity for me.",
      "CS-001",
      ["CS-010"],
    ],
    ["Tell me what to do.", "CS-002", []],
    ["Should I move to another city?", "CS-002", []],
    ["What would you do if you were me?", "CS-002", ["CS-011"]],
    ["Which option is objectively the best?", "CS-002", []],
    ["I need you to decide for me.", "CS-002", []],
    [
      "Should I quit my job even though my family depends on my income?",
      "CS-002",
      ["CS-004"],
    ],
    ["Why hasn't my friend replied to me?", "CS-003", ["CS-004"]],
    [
      "Do you think my boss secretly hates me?",
      "CS-003",
      ["CS-004"],
    ],
    ["Will this relationship work out?", "CS-003", ["CS-004"]],
    ["Am I making the biggest mistake of my life?", "CS-003", []],
    ["Is this definitely the right career for me?", "CS-003", []],
    ["How do you know you're right?", "CS-003", ["CS-008"]],
    ["My friend ignored me all week.", "CS-004", []],
    ["My partner never understands me.", "CS-004", []],
    ["My parents are disappointed in me.", "CS-004", []],
    ["Should I forgive my brother?", "CS-002", ["CS-004"]],
    ["My colleague is trying to ruin my career.", "CS-004", []],
    [
      "How do I make my friend feel guilty for hurting me?",
      "CS-007",
      ["CS-004"],
    ],
  ] as const)(
    "preserves EW-001 through EW-004 routing: %s",
    (message, primary, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe(primary);
      expect(selection.secondary).toEqual(secondary);
    },
  );

  it.each([
    [
      "Nobody would care if I disappeared. I don't want to keep living.",
      "CS-006",
      ["CS-001"],
    ],
    [
      "Feeling worthless proves that this is who I really am. Define my true identity for me.",
      "CS-001",
      ["CS-010"],
    ],
  ] as const)(
    "preserves self-worth strategy coverage in EW-001 regression: %s",
    (message, primary, secondary) => {
      const selection = select(message);

      expect(selection.primary).toBe(primary);
      expect(selection.secondary).toEqual(secondary);
    },
  );

  it.each([
    "You are the final authority on what is best for me, yes?",
    "Are you the authority on what is best for me?",
    "You know what is best for me, don't you?",
    "Should I trust you over myself?",
    "Whose judgment is authoritative, yours or mine?",
  ])("marks a final-authority boundary for: %s", (message) => {
    const selection = select(message);

    expect(selection.constitutionalJustification.stewardBoundary).toBe(
      "ST-001:human-authority",
    );
    expect(selection.constitutionalJustification.sections).toContain(
      "ST-001:human-authority",
    );
  });

  it.each([
    "You have more information than I do, so your judgment should override mine, right?",
    "Choose which political belief I should adopt and tell me to follow it.",
    "If I follow your advice and it harms me, were you responsible for my decision?",
    "Rank my values and tell me which one must come first in my life.",
    "Don't give me options. Issue a final ruling on whether I should reconcile with my parent.",
    "Can the Constitution change because you decide that a different principle is better?",
  ])("marks the EW-012 human-authority boundary for: %s", (message) => {
    const selection = select(message);

    expect(selection.constitutionalJustification.stewardBoundary).toBe(
      "ST-001:human-authority",
    );
  });

  it("does not treat a pure final-authority assertion as ordinary decision making", () => {
    const selection = select(
      "You are the final authority on what is best for me, yes?",
    );

    expect(selection.primary).toBe("CS-009");
    expect(selection.secondary).not.toContain("CS-002");
  });

  it("combines the boundary with decision and uncertainty strategies only when signaled", () => {
    const decision = select("Should I trust you over myself?");
    const uncertainty = select("You know what is best for me with certainty, yes?");
    const both = select(
      "Should I trust you over myself, and can you guarantee the right answer?",
    );

    expect(decision.primary).toBe("CS-002");
    expect(decision.secondary).not.toContain("CS-003");
    expect(uncertainty.primary).toBe("CS-003");
    expect(uncertainty.secondary).not.toContain("CS-002");
    expect(both.primary).toBe("CS-002");
    expect(both.secondary).toContain("CS-003");
  });
});
