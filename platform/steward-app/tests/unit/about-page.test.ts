import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("about production page", () => {
  it("keeps /about route mapped and serves production about content", async () => {
    const [serverSource, about] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/about.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('["/about", { file: "about.html", contentType: "text/html; charset=utf-8" }]');
    expect(serverSource).toContain('"/about/"');

    expect(about).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(about).toContain('name="description"');
    expect(about).toContain('rel="canonical"');
    expect(about).toContain('aria-label="Main navigation"');
    expect(about).toContain('aria-label="Site links"');

    expect(about).toContain('data-i18n="about.missionTitle"');
    expect(about).toContain('data-i18n="about.whyExistsTitle"');
    expect(about).toContain('data-i18n="about.whoStewardTitle"');
    expect(about).toContain('data-i18n="about.notTitle"');
    expect(about).toContain('data-i18n="about.curriculumWorksTitle"');
    expect(about).toContain('data-i18n="about.sixModulesTitle"');
    expect(about).toContain('data-i18n="about.roadmapTitle"');
    expect(about).toContain('data-i18n="about.openDevelopmentTitle"');
    expect(about).toContain('data-i18n="about.footerCtaTitle"');

    expect(about).toContain('href="/courses"');
    expect(about).toContain('data-i18n="home.startLearning"');
    expect(about).toContain('href="/learn"');
    expect(about).toContain('data-i18n="home.talkSteward"');
    expect(about).toContain('class="home-actions"');

    expect(about).toContain('data-i18n="courses.moduleTitle"');
    expect(about).toContain('data-i18n="courses.module2Title"');
    expect(about).toContain('data-i18n="courses.module3Title"');
    expect(about).toContain('data-i18n="courses.module4Title"');
    expect(about).toContain('data-i18n="courses.module5Title"');
    expect(about).toContain('data-i18n="courses.module6Title"');
  });

  it("provides new about locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "about.whyExistsTitle",
      "about.whoStewardTitle",
      "about.notTitle",
      "about.curriculumWorksTitle",
      "about.sixModulesTitle",
      "about.roadmapTitle",
      "about.openDevelopmentTitle",
      "about.footerCtaTitle",
      "about.ctaAria",
      "about.modulesAria",
    ]) {
      expect(enCatalog).toContain(`"${key}"`);
      expect(elCatalog).toContain(`"${key}"`);
    }
  });
});
