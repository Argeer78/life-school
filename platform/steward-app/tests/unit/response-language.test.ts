import { describe, expect, it } from "vitest";
import {
  detectLearnerLanguage,
  resolveResponseLanguage,
} from "../../src/provider/response-language.js";

describe("response-language detection", () => {
  it("detects Greek learner messages", () => {
    expect(detectLearnerLanguage("Ποιος είναι ο σκοπός μου;")).toBe("el");
  });

  it("detects English learner messages", () => {
    expect(detectLearnerLanguage("What is my purpose?")).toBe("en");
  });

  it("falls back safely for unknown messages", () => {
    expect(detectLearnerLanguage("1234 ?!")).toBe("unknown");
    expect(resolveResponseLanguage("1234 ?!")).toBe("en");
    expect(resolveResponseLanguage("1234 ?!", "el")).toBe("el");
  });
});
