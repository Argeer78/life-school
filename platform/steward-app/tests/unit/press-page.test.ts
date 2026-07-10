import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("press production page", () => {
  it("maps /press and serves media resources content", async () => {
    const [serverSource, press] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/press.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/press"');
    expect(serverSource).toContain('"/press/"');
    expect(serverSource).toContain('"press.html"');

    expect(press).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(press).toContain('rel="canonical" href="https://lifesh.app/press"');
    expect(press).toContain('property="og:title" content="Press | Lifeschool"');
    expect(press).toContain('name="twitter:card" content="summary_large_image"');
    expect(press).toContain('"@type": "WebPage"');

    expect(press).toContain('aria-label="Main navigation"');
    expect(press).toContain('data-i18n="press.missionTitle"');
    expect(press).toContain('data-i18n="press.shortDescriptionTitle"');
    expect(press).toContain('data-i18n="press.longDescriptionTitle"');
    expect(press).toContain('data-i18n="press.founderTitle"');
    expect(press).toContain('data-i18n="press.brandTitle"');
    expect(press).toContain('data-i18n="press.logoDownloadsTitle"');
    expect(press).toContain('data-i18n="press.screenshotsTitle"');
    expect(press).toContain('data-i18n="press.contactTitle"');
    expect(press).toContain('data-i18n="press.downloadSectionTitle"');

    expect(press).toContain('data-theme-toggle');
    expect(press).toContain('data-locale="en"');
    expect(press).toContain('data-locale="el"');
  });

  it("provides press locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navPress",
      "press.documentTitle",
      "press.missionTitle",
      "press.shortDescriptionTitle",
      "press.longDescriptionTitle",
      "press.founderTitle",
      "press.assetsTitle",
      "press.brandGuidelinesTitle",
      "press.downloadSectionTitle",
      "press.contactTitle",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
