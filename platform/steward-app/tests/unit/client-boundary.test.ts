import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { projectLearnerResponse } from "../../src/client/learner-response.js";

describe("browser learner-safe boundary", () => {
  it("copies only learner-safe response fields", () => {
    const projected = projectLearnerResponse({
      kind: "accepted",
      text: "Safe response",
      revisions: 1,
      inspection: { responseGeneration: { candidate: "REJECTED" } },
      review: { secret: "REVIEW DETAIL" },
      rawError: "RAW ERROR",
      internalPrompt: "INTERNAL PROMPT",
    });

    expect(projected).toEqual({
      kind: "accepted",
      text: "Safe response",
      revisions: 1,
    });
    expect(JSON.stringify(projected)).not.toMatch(
      /REJECTED|REVIEW DETAIL|RAW ERROR|INTERNAL PROMPT/,
    );
  });

  it.each([
    null,
    {},
    { kind: "accepted", text: "missing revision" },
    { kind: "invalid", text: "x", revisions: 0 },
    { kind: "accepted", text: {}, revisions: 0 },
  ])("rejects malformed browser response %#", (value) => {
    expect(() => projectLearnerResponse(value)).toThrow(TypeError);
  });

  it("contains the required limitation and no persistence or engagement APIs", async () => {
    const [html, app] = await Promise.all([
      readFile(new URL("../../src/client/index.html", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/app.js", import.meta.url), "utf8"),
    ]);

    expect(html).toContain(
      "Steward may be mistaken and is not a final authority.",
    );
    expect(html).toContain('id="clear"');
    expect(`${html}\n${app}`).not.toMatch(
      /localStorage|sessionStorage|indexedDB|analytics|telemetry|notification|streak|reward/i,
    );
    expect(app).toContain("const transcript = []");
    expect(app).not.toContain("inspection");
  });
});
