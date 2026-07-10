import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("updates production page", () => {
  it("maps /updates and serves static updates timeline content", async () => {
    const [serverSource, updates] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/updates.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/updates"');
    expect(serverSource).toContain('"/updates/"');
    expect(serverSource).toContain('"updates.html"');

    expect(updates).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(updates).toContain('rel="canonical" href="https://lifesh.app/updates"');
    expect(updates).toContain('property="og:title" content="Updates | Lifeschool"');
    expect(updates).toContain('name="twitter:card" content="summary_large_image"');
    expect(updates).toContain('type="application/ld+json"');

    expect(updates).toContain('aria-label="Main navigation"');
    expect(updates).toContain('data-i18n="updates.timelineTitle"');
    expect(updates).toContain('data-i18n="updates.release1Version"');
    expect(updates).toContain('data-i18n="updates.release1Summary"');
    expect(updates).toContain('data-i18n="updates.release1Performance"');
    expect(updates).toContain('data-i18n="updates.release2Fixes"');
    expect(updates).toContain('data-i18n="updates.release3Future"');
    expect(updates).toContain('data-i18n="updates.fieldAccessibility"');

    expect(updates).toContain('data-theme-toggle');
    expect(updates).toContain('data-locale="en"');
    expect(updates).toContain('data-locale="el"');
  });

  it("provides updates locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navUpdates",
      "updates.documentTitle",
      "updates.timelineTitle",
      "updates.fieldSummary",
      "updates.release1Summary",
      "updates.release2Fixes",
      "updates.release3Future",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
