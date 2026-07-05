import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function devtoolsHtml(): Promise<string> {
  return readFile(
    new URL("../../src/client/devtools.html", import.meta.url),
    "utf8",
  );
}

describe("Steward DevTools Home", () => {
  it("links to all four developer tools", async () => {
    const html = await devtoolsHtml();

    expect(html).toContain('href="/playground"');
    expect(html).toContain('href="/benchmarks"');
    expect(html).toContain('href="/certification"');
    expect(html).toContain('href="/compare"');
    expect(html).toContain("Inspect one production pipeline run.");
    expect(html).toContain("Execute individual evaluation suites.");
    expect(html).toContain(
      "Execute Foundation certification outputs for human review.",
    );
    expect(html).toContain("Compare two privileged traces.");
  });

  it("shows the certified Foundation baseline", async () => {
    const html = await devtoolsHtml();

    expect(html).toContain("Foundation v1.0 Certified");
    expect(html).toContain("EVAL-001");
    expect(html).toContain("12/12");
    expect(html).toContain("72/72");
  });

  it("is explicitly developer-only and introduces no learner behavior", async () => {
    const html = await devtoolsHtml();

    expect(html).toContain(
      "Developer-only. May expose privileged pipeline information.",
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("/api/message");
    expect(html).not.toContain("/api/playground");
    expect(html).not.toContain("<form");
  });
});
