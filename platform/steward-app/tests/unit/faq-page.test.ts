import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("faq production page", () => {
  it("maps /faq and serves FAQ accordion content", async () => {
    const [serverSource, faq] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/faq.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/faq"');
    expect(serverSource).toContain('"/faq/"');
    expect(serverSource).toContain('"faq.html"');

    expect(faq).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(faq).toContain('rel="canonical" href="https://lifesh.app/faq"');
    expect(faq).toContain('property="og:title" content="FAQ | Lifeschool"');
    expect(faq).toContain('name="twitter:card" content="summary_large_image"');
    expect(faq).toContain('"@type": "FAQPage"');

    expect(faq).toContain('aria-label="Main navigation"');
    expect(faq).toContain('class="faq-accordion"');
    expect(faq).toContain('data-i18n="faq.q1"');
    expect(faq).toContain('data-i18n="faq.q14"');
    expect(faq).toContain('data-i18n="faq.a14"');
    expect(faq).toContain('role="list"');
    expect(faq).toContain('role="listitem"');

    expect(faq).toContain('data-theme-toggle');
    expect(faq).toContain('data-locale="en"');
    expect(faq).toContain('data-locale="el"');
  });

  it("provides FAQ locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navFaq",
      "faq.documentTitle",
      "faq.heroTitle",
      "faq.sectionTitle",
      "faq.q1",
      "faq.a6",
      "faq.q11",
      "faq.a14",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
