import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("impact production page", () => {
  it("maps /impact and serves impact transparency content", async () => {
    const [serverSource, impact] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/impact.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/impact"');
    expect(serverSource).toContain('"/impact/"');
    expect(serverSource).toContain('"impact.html"');

    expect(impact).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(impact).toContain('rel="canonical" href="https://lifesh.app/impact"');
    expect(impact).toContain('property="og:title" content="Impact | Lifeschool"');
    expect(impact).toContain('name="twitter:card" content="summary_large_image"');
    expect(impact).toContain('"@type": "WebPage"');

    expect(impact).toContain('aria-label="Main navigation"');
    expect(impact).toContain('data-i18n="impact.statsTitle"');
    expect(impact).toContain('data-i18n="impact.currentModulesValue"');
    expect(impact).toContain('data-i18n="impact.lessonsValue"');
    expect(impact).toContain('data-i18n="impact.languagesValue"');
    expect(impact).toContain('data-i18n="impact.countriesValue"');
    expect(impact).toContain('data-i18n="impact.phaseValue"');
    expect(impact).toContain('data-i18n="impact.longTermVisionValue"');

    expect(impact).toContain('data-theme-toggle');
    expect(impact).toContain('data-locale="en"');
    expect(impact).toContain('data-locale="el"');
  });

  it("provides impact locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navImpact",
      "impact.documentTitle",
      "impact.statsTitle",
      "impact.currentModulesValue",
      "impact.lessonsValue",
      "impact.languagesValue",
      "impact.phaseValue",
      "impact.longTermVisionValue",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
