import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("research production page", () => {
  it("maps /research and serves educational philosophy sections", async () => {
    const [serverSource, research] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/research.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/research"');
    expect(serverSource).toContain('"/research/"');
    expect(serverSource).toContain('"research.html"');

    expect(research).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(research).toContain('rel="canonical" href="https://lifesh.app/research"');
    expect(research).toContain('property="og:title" content="Research | Lifeschool"');
    expect(research).toContain('name="twitter:card" content="summary_large_image"');
    expect(research).toContain('"@type": "WebPage"');

    expect(research).toContain('aria-label="Main navigation"');
    expect(research).toContain('data-i18n="research.whyExistsTitle"');
    expect(research).toContain('data-i18n="research.principlesTitle"');
    expect(research).toContain('data-i18n="research.thinkingOverAnswersTitle"');
    expect(research).toContain('data-i18n="research.stewardWorksTitle"');
    expect(research).toContain('data-i18n="research.curriculumDesignTitle"');
    expect(research).toContain('data-i18n="research.aiRoleTitle"');
    expect(research).toContain('data-i18n="research.directionTitle"');
    expect(research).toContain('data-i18n="research.independenceTitle"');
    expect(research).toContain('data-i18n="research.transparencyTitle"');
    expect(research).toContain('data-i18n="research.futureTitle"');
    expect(research).toContain('data-i18n="research.contactTitle"');

    expect(research).toContain('data-theme-toggle');
    expect(research).toContain('data-locale="en"');
    expect(research).toContain('data-locale="el"');
  });

  it("provides research locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navResearch",
      "research.documentTitle",
      "research.whyExistsTitle",
      "research.principlesTitle",
      "research.thinkingOverAnswersTitle",
      "research.stewardWorksTitle",
      "research.curriculumDesignTitle",
      "research.aiRoleTitle",
      "research.directionTitle",
      "research.independenceTitle",
      "research.transparencyTitle",
      "research.futureTitle",
      "research.contactTitle",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
