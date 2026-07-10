import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("support production page", () => {
  it("maps /support and serves production support content", async () => {
    const [serverSource, support] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/support.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/support"');
    expect(serverSource).toContain('"/support/"');
    expect(serverSource).toContain('"support.html"');

    expect(support).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(support).toContain('rel="canonical" href="https://lifesh.app/support"');
    expect(support).toContain('property="og:title" content="Support Lifeschool"');
    expect(support).toContain('name="twitter:card" content="summary_large_image"');
    expect(support).toContain('type="application/ld+json"');

    expect(support).toContain('aria-label="Main navigation"');
    expect(support).toContain('aria-label="Site links"');
    expect(support).toContain('data-i18n="support.heroHeadline"');
    expect(support).toContain('data-i18n="support.independenceQuote"');
    expect(support).toContain('data-i18n="support.tierFoundingTitle"');
    expect(support).toContain('data-i18n="support.statusTitle"');
    expect(support).toContain('data-i18n="support.impactTitle"');
    expect(support).toContain('data-i18n="support.transparencyTitle"');
    expect(support).toContain('data-i18n="support.faqTitle"');
    expect(support).toContain('data-i18n="support.contactCta"');

    expect(support).toContain('data-theme-toggle');
    expect(support).toContain('data-locale="en"');
    expect(support).toContain('data-locale="el"');
  });

  it("provides support locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navSupport",
      "support.documentTitle",
      "support.heroHeadline",
      "support.primaryCta",
      "support.independenceQuote",
      "support.tierFoundingTitle",
      "support.statusTitle",
      "support.impact8",
      "support.transparencyStatement",
      "support.faqQ5",
      "support.contactCta",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
