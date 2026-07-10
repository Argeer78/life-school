import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("roadmap production page", () => {
  it("maps /roadmap and serves production roadmap content", async () => {
    const [serverSource, roadmap] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/roadmap.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/roadmap"');
    expect(serverSource).toContain('"/roadmap/"');
    expect(serverSource).toContain('"roadmap.html"');

    expect(roadmap).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(roadmap).toContain('rel="canonical" href="https://lifesh.app/roadmap"');
    expect(roadmap).toContain('property="og:title" content="Roadmap | Lifeschool"');
    expect(roadmap).toContain('name="twitter:card" content="summary_large_image"');
    expect(roadmap).toContain('type="application/ld+json"');

    expect(roadmap).toContain('aria-label="Main navigation"');
    expect(roadmap).toContain('aria-label="Site links"');
    expect(roadmap).toContain('data-i18n="roadmap.heroTitle"');
    expect(roadmap).toContain('data-i18n="roadmap.timelineTitle"');
    expect(roadmap).toContain('data-i18n="roadmap.completedTitle"');
    expect(roadmap).toContain('data-i18n="roadmap.inProgressTitle"');
    expect(roadmap).toContain('data-i18n="roadmap.plannedTitle"');
    expect(roadmap).toContain('data-i18n="roadmap.noteBody"');
    expect(roadmap).toContain('data-i18n="roadmap.ctaButton"');

    expect(roadmap).toContain('data-theme-toggle');
    expect(roadmap).toContain('data-locale="en"');
    expect(roadmap).toContain('data-locale="el"');
  });

  it("provides roadmap locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navRoadmap",
      "roadmap.documentTitle",
      "roadmap.heroTitle",
      "roadmap.heroSubtitle",
      "roadmap.completed12",
      "roadmap.inProgress3",
      "roadmap.planned10",
      "roadmap.noteBody",
      "roadmap.ctaButton",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
