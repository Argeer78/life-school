import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("accessibility guardrails", () => {
  it("keeps feedback FAB attached within page landmarks", async () => {
    const theme = await readFile(
      new URL("../../src/client/theme.js", import.meta.url),
      "utf8",
    );

    expect(theme).toContain("function moveFeedbackIntoLandmark() {");
    expect(theme).toContain("feedbackObserver.observe(document.body");
    expect(theme).toContain("landmark.append(button)");
  });

  it("keeps reduced-motion support and keyboard-visible focus styles", async () => {
    const [styles, courses, learn] = await Promise.all([
      readFile(new URL("../../src/client/styles.css", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/courses.css", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/learn.css", import.meta.url), "utf8"),
    ]);

    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(courses).toContain(":focus-visible");
    expect(learn).toContain(":focus-visible");
  });

  it("preserves dialog semantics for cookie consent controls", async () => {
    const theme = await readFile(
      new URL("../../src/client/theme.js", import.meta.url),
      "utf8",
    );

    expect(theme).toContain('banner.setAttribute("role", "dialog")');
    expect(theme).toContain('banner.setAttribute("aria-modal", "false")');
    expect(theme).toContain('data-cookie-choice="accepted"');
    expect(theme).toContain('data-cookie-choice="declined"');
  });
});
