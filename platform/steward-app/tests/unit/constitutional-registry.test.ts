import { describe, expect, it } from "vitest";
import {
  conversationStageAuthority,
  constitutionalSections,
  isConstitutionalSectionId,
} from "../../src/steward/constitutional-registry.js";
import { parseConstitutionalMapping } from "../../src/steward/conversation-schema.js";
import { constitutionalMapping } from "../fixtures/conversation-stage-fixtures.js";

describe("closed constitutional section registry", () => {
  it("contains approved sections from every permitted authority layer", () => {
    const documents = new Set(
      Object.values(constitutionalSections).map(({ document }) => document),
    );

    expect(documents).toEqual(
      new Set([
        "CA-001",
        "LS-001",
        "LS-002",
        "LS-003",
        "LS-004",
        "LS-005",
        "LS-006",
        "LS-007",
        "LS-008",
        "ST-001",
      ]),
    );
  });

  it("accepts exact registered IDs and rejects invented suffixes", () => {
    expect(isConstitutionalSectionId("CA-001:meaning")).toBe(true);
    expect(isConstitutionalSectionId("CA-001:invented-authority")).toBe(false);
    expect(isConstitutionalSectionId("CA-001 Invented Authority")).toBe(false);
  });

  it("gives every conversation stage at least one registered authority", () => {
    expect(Object.keys(conversationStageAuthority).sort()).toEqual([
      "behaviorPlanning",
      "constitutionalMapping",
      "constitutionalReview",
      "fallback",
      "intentDetection",
      "responseGeneration",
      "revision",
      "strategySelection",
    ]);

    for (const references of Object.values(conversationStageAuthority)) {
      expect(references.length).toBeGreaterThan(0);
      expect(references.every(isConstitutionalSectionId)).toBe(true);
    }
  });

  it("rejects a mapping that attaches invented meaning to a valid document", () => {
    expect(() =>
      parseConstitutionalMapping({
        ...constitutionalMapping,
        references: ["CA-001:invented-authority"],
      }),
    ).toThrow(TypeError);
  });
});
