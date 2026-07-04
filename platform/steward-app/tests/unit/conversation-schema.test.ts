import { describe, expect, it } from "vitest";
import {
  parseConstitutionalMapping,
  parseIntentDetection,
} from "../../src/steward/conversation-schema.js";
import {
  constitutionalMapping,
  reflectionIntent,
} from "../fixtures/conversation-stage-fixtures.js";

describe("conversation stage schemas", () => {
  it("accepts valid structured stage outputs", () => {
    expect(parseIntentDetection(reflectionIntent)).toEqual(reflectionIntent);
    expect(parseConstitutionalMapping(constitutionalMapping)).toEqual(
      constitutionalMapping,
    );
  });

  it.each([
    {},
    { ...reflectionIntent, intent: "mind-reading" },
    { ...reflectionIntent, confidence: 0.9 },
    { ...reflectionIntent, summary: "" },
    { ...reflectionIntent, needsClarification: "no" },
  ])("rejects invalid intent detection %#", (value) => {
    expect(() => parseIntentDetection(value)).toThrow(TypeError);
  });

  it.each([
    {},
    { ...constitutionalMapping, references: [] },
    { ...constitutionalMapping, references: ["INVENTED-001"] },
    { ...constitutionalMapping, references: ["CA-001 Invented Authority"] },
    { ...constitutionalMapping, protections: ["popularity"] },
    { ...constitutionalMapping, limits: [] },
  ])("rejects invalid constitutional mapping %#", (value) => {
    expect(() => parseConstitutionalMapping(value)).toThrow(TypeError);
  });

});
