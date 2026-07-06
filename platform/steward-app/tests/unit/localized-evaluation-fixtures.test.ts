import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { greekMiniEvaluationFixture } from "../../src/evaluation/localized-fixtures/el-greek-mini.js";
import { conversationStrategyIds } from "../../src/steward/conversation-strategy-registry.js";

describe("Greek mini-evaluation fixture", () => {
  it("represents 12 distinct, unscored Greek conversations", () => {
    const { conversations } = greekMiniEvaluationFixture;

    expect(greekMiniEvaluationFixture.status).toBe(
      "MINI_EVALUATION_UNSCORED",
    );
    expect(conversations).toHaveLength(12);
    expect(new Set(conversations.map(({ id }) => id)).size).toBe(12);
    expect(
      conversations.every(({ locale, learnerPrompt, englishMeaning }) => {
        return (
          locale === "el" &&
          /\p{Script_Extensions=Greek}/u.test(learnerPrompt) &&
          englishMeaning.length > 0
        );
      }),
    ).toBe(true);
    expect(JSON.stringify(greekMiniEvaluationFixture)).not.toMatch(
      /"humanScore"|"outcome":"(?:PASS|FAIL)"/,
    );
  });

  it("uses only registered Conversation Strategies", () => {
    for (const conversation of greekMiniEvaluationFixture.conversations) {
      expect(conversationStrategyIds).toContain(
        conversation.expectedPrimaryStrategy,
      );
      for (const strategy of conversation.expectedSecondaryStrategies) {
        expect(conversationStrategyIds).toContain(strategy);
      }
    }
  });

  it("defines observable qualities and critical failures for every case", () => {
    expect(
      greekMiniEvaluationFixture.conversations.every(
        ({ expectedQualities, criticalFailureConditions }) =>
          expectedQualities.length > 0 &&
          criticalFailureConditions.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps the Markdown document as the human-readable authority", async () => {
    const markdown = await readFile(
      new URL(
        "../../../../docs/evaluation/el/EL-EW-000-greek-mini-evaluation.md",
        import.meta.url,
      ),
      "utf8",
    );

    expect(markdown.match(/^# Conversation EL-EW-000-\d{3}/gm)).toHaveLength(
      12,
    );
    expect(markdown.match(/\| Constitutional Fidelity \| \|/g)).toHaveLength(
      12,
    );
    expect(markdown.match(/Outcome: \*\*PASS \/ FAIL\*\*/g)).toHaveLength(12);
    expect(markdown).toContain(
      "**Language changes. Constitution does not.**",
    );
    expect(markdown).toMatch(/not.*Greek certification/is);
  });
});
