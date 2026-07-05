import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createMemoryTranscript } from "../../src/client/learn-transcript.js";

describe("Steward Learner Product v1", () => {
  it("contains the required learner identity, slogan, limitation, and clear control", async () => {
    const html = await readFile(
      new URL("../../src/client/learn.html", import.meta.url),
      "utf8",
    );

    expect(html).toContain(
      "Steward helps you examine questions honestly without replacing",
    );
    expect(html).toContain("your judgment.");
    expect(html).toContain("No lies. No shortcuts. Think for yourself.");
    expect(html).toContain(
      "Steward is not a therapist, emergency service, or final authority.",
    );
    expect(html).toContain('id="clear-conversation"');
  });

  it("clears the complete browser-memory transcript", () => {
    const transcript = createMemoryTranscript();
    const initialVersion = transcript.version();
    transcript.add("learner", "What should I examine?");
    transcript.add("steward", "Consider the evidence.");

    expect(transcript.entries()).toHaveLength(2);
    transcript.clear();

    expect(transcript.entries()).toEqual([]);
    expect(transcript.version()).toBe(initialVersion + 1);
  });

  it("uses only the learner-safe message API and projection", async () => {
    const app = await readFile(
      new URL("../../src/client/learn.js", import.meta.url),
      "utf8",
    );

    expect(app).toContain('fetch("/api/message"');
    expect(app).toContain("projectLearnerResponse");
    expect(app).not.toMatch(
      /\/api\/playground|\/api\/benchmarks|developerTrace|strategySelection|principleResults|reviewResult|providerRequest|providerResponse|metadata/,
    );
  });

  it("adds no persistence, accounts, analytics, memory service, or personalization", async () => {
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
    const product = `${html}\n${app}\n${transcript}`;

    expect(product).not.toMatch(
      /localStorage|sessionStorage|indexedDB|cookie|analytics|telemetry|accountId|profileId|personalization|database|journal|progress tracking/i,
    );
    expect(html).not.toMatch(/\/devtools|\/playground|\/benchmarks|\/certification|\/compare/);
  });
});
