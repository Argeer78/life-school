import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("transparency production page", () => {
  it("maps /transparency and serves governance sections", async () => {
    const [serverSource, transparency] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/transparency.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/transparency"');
    expect(serverSource).toContain('"/transparency/"');
    expect(serverSource).toContain('"transparency.html"');

    expect(transparency).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(transparency).toContain('rel="canonical" href="https://lifesh.app/transparency"');
    expect(transparency).toContain('property="og:title" content="Transparency | Lifeschool"');
    expect(transparency).toContain('name="twitter:card" content="summary_large_image"');
    expect(transparency).toContain('"@type": "WebPage"');

    expect(transparency).toContain('aria-label="Main navigation"');
    expect(transparency).toContain('data-i18n="transparency.missionTitle"');
    expect(transparency).toContain('data-i18n="transparency.governanceTitle"');
    expect(transparency).toContain('data-i18n="transparency.fundingTitle"');
    expect(transparency).toContain('data-i18n="transparency.supportersTitle"');
    expect(transparency).toContain('data-i18n="transparency.privacyTitle"');
    expect(transparency).toContain('data-i18n="transparency.aiUsageTitle"');
    expect(transparency).toContain('data-i18n="transparency.independenceTitle"');
    expect(transparency).toContain('data-i18n="transparency.openDevelopmentTitle"');
    expect(transparency).toContain('data-i18n="transparency.reportsTitle"');
    expect(transparency).toContain('data-i18n="transparency.futureReportsTitle"');
    expect(transparency).toContain('data-i18n="transparency.contactTitle"');

    expect(transparency).toContain('data-theme-toggle');
    expect(transparency).toContain('data-locale="en"');
    expect(transparency).toContain('data-locale="el"');
  });

  it("provides transparency locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navTransparency",
      "transparency.documentTitle",
      "transparency.missionTitle",
      "transparency.governanceTitle",
      "transparency.fundingTitle",
      "transparency.supportersTitle",
      "transparency.privacyTitle",
      "transparency.aiUsageTitle",
      "transparency.independenceTitle",
      "transparency.openDevelopmentTitle",
      "transparency.reportsTitle",
      "transparency.futureReportsTitle",
      "transparency.contactTitle",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
