import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("educators production page", () => {
  it("maps /educators and serves classroom guidance content", async () => {
    const [serverSource, educators] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/educators.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/educators"');
    expect(serverSource).toContain('"/educators/"');
    expect(serverSource).toContain('"educators.html"');

    expect(educators).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(educators).toContain('rel="canonical" href="https://lifesh.app/educators"');
    expect(educators).toContain('property="og:title" content="Educators | Lifeschool"');
    expect(educators).toContain('name="twitter:card" content="summary_large_image"');
    expect(educators).toContain('"@type": "WebPage"');

    expect(educators).toContain('aria-label="Main navigation"');
    expect(educators).toContain('data-i18n="educators.teachingTitle"');
    expect(educators).toContain('data-i18n="educators.universitiesTitle"');
    expect(educators).toContain('data-i18n="educators.schoolsTitle"');
    expect(educators).toContain('data-i18n="educators.adultEducationTitle"');
    expect(educators).toContain('data-i18n="educators.discussionGroupsTitle"');
    expect(educators).toContain('data-i18n="educators.criticalThinkingTitle"');
    expect(educators).toContain('data-i18n="educators.stewardClassroomsTitle"');
    expect(educators).toContain('data-i18n="educators.faqTitle"');
    expect(educators).toContain('data-i18n="educators.futureFeaturesTitle"');
    expect(educators).toContain('data-i18n="educators.ctaTitle"');
    expect(educators).toContain('data-i18n="educators.contactTitle"');

    expect(educators).toContain('data-theme-toggle');
    expect(educators).toContain('data-locale="en"');
    expect(educators).toContain('data-locale="el"');
  });

  it("provides educators locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navEducators",
      "educators.documentTitle",
      "educators.teachingTitle",
      "educators.universitiesTitle",
      "educators.schoolsTitle",
      "educators.adultEducationTitle",
      "educators.discussionGroupsTitle",
      "educators.criticalThinkingTitle",
      "educators.stewardClassroomsTitle",
      "educators.faqTitle",
      "educators.futureFeaturesTitle",
      "educators.ctaTitle",
      "educators.contactTitle",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
