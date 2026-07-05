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

  it("keeps the Playground stateless and free of alternate constitutional logic", async () => {
    const [html, app, trace] = await Promise.all([
      readFile(
        new URL("../../src/client/playground.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/playground.js", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/playground-trace.js", import.meta.url),
        "utf8",
      ),
    ]);
    const client = `${html}\n${app}\n${trace}`;

    expect(html).not.toContain('action="/api/playground"');
    expect(app).toContain('fetch("/api/playground"');
    expect(html).toContain("Local developer inspection only.");
    expect(html).toContain("Copy Trace JSON");
    expect(app).toContain("navigator.clipboard.writeText");
    expect(app).toContain('document.execCommand("copy")');
    expect(app).toContain("serializePlaygroundTrace(latestResult)");
    expect(client).not.toMatch(
      /localStorage|sessionStorage|indexedDB|analytics|telemetry|history\s*=|transcript\s*=/i,
    );
    expect(app).not.toMatch(
      /CS-\d{3}|selectConversationStrategies|planFromStrategySelection|validateProviderResult|rejectAssignedPurpose/,
    );
  });

  it("keeps the Benchmark Runner stateless and free of evaluation logic", async () => {
    const [html, app] = await Promise.all([
      readFile(
        new URL("../../src/client/benchmarks.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/benchmarks.js", import.meta.url),
        "utf8",
      ),
    ]);
    const client = `${html}\n${app}`;

    expect(html).toContain("Human evaluation remains manual.");
    expect(html).toContain("Show privileged summaries");
    expect(app).toContain('fetch("/api/benchmarks"');
    expect(app).toContain('fetch("/api/benchmarks/run"');
    expect(client).not.toMatch(
      /localStorage|sessionStorage|indexedDB|analytics|telemetry|history\s*=|transcript\s*=/i,
    );
    expect(app).not.toMatch(
      /runConstitutionalConversation|runEvaluationSet|runEvaluationCertification|selectConversationStrategies|validateProviderResult/,
    );
    expect(app).not.toMatch(/status\s*=\s*["']PASS["']/);
  });

  it("keeps certification execution canonical, manual, and safe by default", async () => {
    const [html, app] = await Promise.all([
      readFile(
        new URL("../../src/client/certification.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/certification.js", import.meta.url),
        "utf8",
      ),
    ]);
    const client = `${html}\n${app}`;

    expect(html).toContain(
      "Certification execution collects outputs. Human scoring is still",
    );
    expect(html).toContain("required under EVAL-000.");
    expect(html).toContain("Show privileged summaries");
    expect(app).toContain('fetch("/api/benchmarks"');
    expect(app).toContain('fetch("/api/benchmarks/run"');
    expect(app).toContain('scope: "all"');
    expect(client).not.toMatch(
      /localStorage|sessionStorage|indexedDB|analytics|telemetry|history\s*=|transcript\s*=/i,
    );
    expect(app).not.toMatch(
      /runConstitutionalConversation|runEvaluationCertification|selectConversationStrategies|validateProviderResult/,
    );
    expect(app).not.toMatch(/status\s*=\s*["']PASS["']/);
    expect(app).not.toMatch(/status\s*=\s*["']FAIL["']/);
  });

  it("keeps Trace Comparison local, structural, and developer-only", async () => {
    const [html, app, comparison] = await Promise.all([
      readFile(
        new URL("../../src/client/compare.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/compare.js", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/trace-comparison.js", import.meta.url),
        "utf8",
      ),
    ]);
    const client = `${html}\n${app}\n${comparison}`;

    expect(html).toContain("Developer-only.");
    expect(html).toContain("does not");
    expect(html).toContain("infer constitutional meaning");
    expect(app).not.toContain("fetch(");
    expect(client).not.toMatch(
      /localStorage|sessionStorage|indexedDB|analytics|telemetry/,
    );
    expect(client).not.toMatch(
      /runConstitutionalConversation|selectConversationStrategies|planFromStrategySelection|validateProviderResult/,
    );
  });

  it("keeps DevTools Home separate from learner UI behavior", async () => {
    const [devtools, learnerHtml, learnerApp] = await Promise.all([
      readFile(
        new URL("../../src/client/devtools.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/index.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/app.js", import.meta.url),
        "utf8",
      ),
    ]);

    expect(devtools).not.toContain("<script");
    expect(devtools).not.toContain("/api/message");
    expect(learnerHtml).not.toContain("privileged pipeline information");
    expect(learnerApp).not.toContain("/devtools");
    expect(learnerApp).not.toContain("inspection");
  });

  it("keeps /learn learner-safe, ephemeral, and separate from DevTools", async () => {
    const [html, app, transcript] = await Promise.all([
      readFile(
        new URL("../../src/client/learn.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/learn.js", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/learn-transcript.js", import.meta.url),
        "utf8",
      ),
    ]);
    const learnerProduct = `${html}\n${app}\n${transcript}`;

    expect(app).toContain('fetch("/api/message"');
    expect(app).toContain("projectLearnerResponse");
    expect(learnerProduct).not.toMatch(
      /developerTrace|inspection|strategySelection|reviewResult|principleResults|providerRequest|providerResponse/,
    );
    expect(learnerProduct).not.toMatch(
      /localStorage|sessionStorage|indexedDB|analytics|telemetry|accountId|profileId/,
    );
    expect(html).not.toMatch(
      /\/devtools|\/playground|\/benchmarks|\/certification|\/compare/,
    );
  });
});
