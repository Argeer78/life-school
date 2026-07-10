import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  localeCatalogs,
  resolveLocale,
  supportedLocales,
  translate,
} from "../../src/i18n/i18n.js";

describe("Lifeschool multilingual foundation v1", () => {
  it("supports complete English and Greek locale catalogs", () => {
    expect(supportedLocales).toEqual(["en", "el"]);
    expect(Object.keys(localeCatalogs.el).sort()).toEqual(
      Object.keys(localeCatalogs.en).sort(),
    );
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("el")).toBe("el");
    expect(resolveLocale("fr")).toBe("en");
  });

  it("renders static learner labels in English and Greek", () => {
    expect(translate("en", "learn.clear")).toBe("Clear conversation");
    expect(translate("el", "learn.clear")).toBe("Καθάρισε τη συνομιλία");
    expect(
      translate("en", "lesson.numberOf", { number: 2, total: 6 }),
    ).toBe("Lesson 2 of 6");
    expect(
      translate("el", "lesson.numberOf", { number: 2, total: 6 }),
    ).toBe("Μάθημα 2 από 6");
    expect(translate("el", "courses.moduleTitle")).toBe("Καθαρή σκέψη");
    expect(translate("el", "common.english")).toBe("Αγγλικά");
  });

  it("contains no untranslated English UI copy in the Greek catalog", () => {
    const greekUiCopy = Object.values(localeCatalogs.el)
      .join(" ")
      .replaceAll(/Steward|Lifeschool|AlphaSynth|\{[a-z]+\}/g, "");

    expect(greekUiCopy).not.toMatch(/[A-Za-z]{3,}/);
  });

  it("marks /learn, /courses, and lesson chrome for locale switching", async () => {
    const [learn, courses, renderer] = await Promise.all([
      readFile(new URL("../../src/client/learn.html", import.meta.url), "utf8"),
      readFile(
        new URL("../../src/client/courses.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../src/client/lesson-renderer.js", import.meta.url),
        "utf8",
      ),
    ]);
    const surfaces = `${learn}\n${courses}\n${renderer}`;

    for (const locale of ["en", "el"]) {
      expect(surfaces).toContain(`data-locale="${locale}"`);
    }
    expect(learn).toContain('data-i18n="learn.limitation"');
    expect(learn).toContain('data-i18n="common.slogan"');
    expect(courses).toContain('data-i18n="courses.homeTitle"');
    expect(courses).toContain('data-i18n="courses.moduleTitle"');
    expect(courses).toContain('data-i18n="courses.lesson6Title"');
    expect(courses).toContain('data-i18n="courses.module2Title"');
    expect(courses).toContain('data-i18n="courses.module6Lesson6Title"');
    expect(renderer).toContain('"lesson.practiceWithSteward"');
    expect(renderer).toContain('data-i18n="lesson.returnModule"');
  });

  it("keeps Steward generation provider-driven and learner-safe", async () => {
    const [learnApp, lessonApp] = await Promise.all([
      readFile(new URL("../../src/client/learn.js", import.meta.url), "utf8"),
      readFile(
        new URL("../../src/client/lesson-page.js", import.meta.url),
        "utf8",
      ),
    ]);

    for (const app of [learnApp, lessonApp]) {
      expect(app).toContain('fetch("/api/message"');
      expect(app).toContain("projectLearnerResponse");
      expect(app).toContain("JSON.stringify({ message })");
      expect(app).not.toMatch(
        /strategySelection|reviewResult|providerRequest|providerResponse|developerTrace/,
      );
      expect(app).not.toMatch(/locale.*JSON\.stringify|language.*JSON\.stringify/i);
    }
  });

  it("persists only the browser locale preference", async () => {
    const [runtime, learnApp, lessonApp, transcript, session] =
      await Promise.all([
        readFile(new URL("../../src/client/i18n.js", import.meta.url), "utf8"),
        readFile(new URL("../../src/client/learn.js", import.meta.url), "utf8"),
        readFile(
          new URL("../../src/client/lesson-page.js", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL("../../src/client/learn-transcript.js", import.meta.url),
          "utf8",
        ),
        readFile(
          new URL("../../src/client/course-session.js", import.meta.url),
          "utf8",
        ),
      ]);

    expect(runtime).toContain('const preferenceKey = "lifeschool.locale"');
    expect(runtime).toContain("window.localStorage.getItem(preferenceKey)");
    expect(runtime).toContain("window.localStorage.setItem(preferenceKey, locale)");
    expect(`${learnApp}\n${lessonApp}\n${transcript}\n${session}`).not.toMatch(
      /localStorage|sessionStorage|indexedDB|cookie|database|accountId|profileId|analytics|telemetry/i,
    );
  });
});
