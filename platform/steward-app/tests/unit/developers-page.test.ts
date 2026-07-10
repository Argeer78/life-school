import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("developers production page", () => {
  it("maps /developers and serves documentation-only integration roadmap", async () => {
    const [serverSource, developers] = await Promise.all([
      readFile(new URL("../../src/server/local-server.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/developers.html", import.meta.url), "utf8"),
    ]);

    expect(serverSource).toContain('"/developers"');
    expect(serverSource).toContain('"/developers/"');
    expect(serverSource).toContain('"developers.html"');

    expect(developers).toContain('name="viewport" content="width=device-width, initial-scale=1"');
    expect(developers).toContain('rel="canonical" href="https://lifesh.app/developers"');
    expect(developers).toContain('property="og:title" content="Developers | Lifeschool"');
    expect(developers).toContain('name="twitter:card" content="summary_large_image"');
    expect(developers).toContain('"@type": "WebPage"');

    expect(developers).toContain('aria-label="Main navigation"');
    expect(developers).toContain('data-i18n="developers.statusTitle"');
    expect(developers).toContain('data-i18n="developers.statusBody"');
    expect(developers).toContain('data-i18n="developers.documentationOnlyTitle"');
    expect(developers).toContain('data-i18n="developers.documentationOnlyBody"');
    expect(developers).toContain('data-i18n="developers.plansTitle"');
    expect(developers).toContain('data-i18n="developers.planLearningApis"');
    expect(developers).toContain('data-i18n="developers.planOrganizationIntegrations"');
    expect(developers).toContain('data-i18n="developers.planEducationalExports"');
    expect(developers).toContain('data-i18n="developers.planLmsIntegration"');
    expect(developers).toContain('data-i18n="developers.planSso"');
    expect(developers).toContain('data-i18n="developers.planClassroomApis"');
    expect(developers).toContain('data-i18n="developers.planWebhookSupport"');

    expect(developers).toContain('data-theme-toggle');
    expect(developers).toContain('data-locale="en"');
    expect(developers).toContain('data-locale="el"');
  });

  it("provides developers locale keys in English and Greek", async () => {
    const [enCatalog, elCatalog] = await Promise.all([
      readFile(new URL("../../src/i18n/locales/en.json", import.meta.url), "utf8"),
      readFile(new URL("../../src/i18n/locales/el.json", import.meta.url), "utf8"),
    ]);

    for (const key of [
      "common.navDevelopers",
      "developers.documentTitle",
      "developers.statusTitle",
      "developers.statusBody",
      "developers.documentationOnlyTitle",
      "developers.documentationOnlyBody",
      "developers.plansTitle",
      "developers.planLearningApis",
      "developers.planOrganizationIntegrations",
      "developers.planEducationalExports",
      "developers.planLmsIntegration",
      "developers.planSso",
      "developers.planClassroomApis",
      "developers.planWebhookSupport",
    ]) {
      expect(enCatalog).toContain(`\"${key}\"`);
      expect(elCatalog).toContain(`\"${key}\"`);
    }
  });
});
