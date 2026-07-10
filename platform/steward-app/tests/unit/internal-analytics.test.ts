import { describe, expect, it } from "vitest";
import {
  deviceTypeFromUserAgent,
  InternalAnalytics,
  InvalidAnalyticsRequest,
  parseAnalyticsEvent,
} from "../../src/server/internal-analytics.js";

describe("internal privacy-first analytics", () => {
  it("parses valid anonymous analytics events", () => {
    expect(parseAnalyticsEvent({ type: "page_view", path: "/courses", locale: "en" })).toEqual({
      type: "page_view",
      path: "/courses",
      locale: "en",
    });
    expect(parseAnalyticsEvent({ type: "module_started", moduleSlug: "thinking-clearly" })).toEqual({
      type: "module_started",
      moduleSlug: "thinking-clearly",
    });
    expect(parseAnalyticsEvent({
      type: "lesson_duration",
      moduleSlug: "thinking-clearly",
      lessonNumber: 2,
      durationMs: 120000,
    })).toEqual({
      type: "lesson_duration",
      moduleSlug: "thinking-clearly",
      lessonNumber: 2,
      durationMs: 120000,
    });
  });

  it("rejects requests that include conversation or reflection payload fields", () => {
    for (const body of [
      { type: "page_view", path: "/", message: "private" },
      { type: "module_started", moduleSlug: "thinking-clearly", reflection: "private" },
      { type: "lesson_duration", moduleSlug: "thinking-clearly", lessonNumber: 2, durationMs: 100, transcript: "private" },
    ]) {
      expect(() => parseAnalyticsEvent(body)).toThrow(InvalidAnalyticsRequest);
    }
  });

  it("aggregates module, lesson, page, language, and device metrics", () => {
    const analytics = new InternalAnalytics();
    analytics.ingest(
      parseAnalyticsEvent({ type: "page_view", path: "/courses", locale: "en" }),
      { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", acceptLanguage: "en-US,en;q=0.9" },
    );
    analytics.ingest(
      parseAnalyticsEvent({ type: "module_started", moduleSlug: "thinking-clearly" }),
      { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", acceptLanguage: "el-GR,el;q=0.9" },
    );
    analytics.ingest(
      parseAnalyticsEvent({ type: "lesson_completed", moduleSlug: "thinking-clearly", lessonNumber: 1 }),
      { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", acceptLanguage: "el-GR,el;q=0.9" },
    );
    analytics.ingest(
      parseAnalyticsEvent({ type: "lesson_duration", moduleSlug: "thinking-clearly", lessonNumber: 1, durationMs: 180000 }),
      { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", acceptLanguage: "el-GR,el;q=0.9" },
    );
    analytics.ingest(
      parseAnalyticsEvent({ type: "module_helpful", moduleSlug: "thinking-clearly" }),
      { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", acceptLanguage: "en-US,en;q=0.9" },
    );

    const summary = analytics.summary();
    expect(summary.totals.eventsIngested).toBe(5);
    expect(summary.modulesStarted["thinking-clearly"]).toBe(1);
    expect(summary.modulesCompleted["thinking-clearly"] ?? 0).toBe(0);
    expect(summary.lessonCompletion["thinking-clearly/lesson-1"]).toBe(1);
    expect(summary.helpfulModules["thinking-clearly"]).toBe(1);
    expect(summary.totals.averageLessonDurationMs).toBe(180000);
    expect(summary.languageUsage.en).toBeGreaterThan(0);
    expect(summary.languageUsage.el).toBeGreaterThan(0);
    expect(summary.deviceTypes.desktop).toBeGreaterThan(0);
    expect(summary.deviceTypes.mobile).toBeGreaterThan(0);
    expect(summary.mostVisitedPages[0]).toEqual({ path: "/courses", count: 1 });
  });

  it("classifies common user agents into anonymous device types", () => {
    expect(deviceTypeFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceTypeFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile")).toBe("mobile");
    expect(deviceTypeFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(deviceTypeFromUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe("bot");
  });
});
