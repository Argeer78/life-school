import { describe, expect, it } from "vitest";
import {
  CommunicationRateLimiter,
  InvalidCommunicationRequest,
  parseContactSubmission,
  parseFeedbackSubmission,
} from "../../src/server/communication-api.js";

describe("communication API validation", () => {
  it("validates required production contact fields", () => {
    const submission = parseContactSubmission({
      name: "Ada Lovelace",
      email: "ada@example.com",
      subject: "Partnership inquiry",
      category: "Partnership",
      message: "We would like to discuss a school pilot for next semester.",
      company: "",
      startedAt: Date.now() - 2_000,
    });

    expect(submission.name).toBe("Ada Lovelace");
    expect(submission.category).toBe("Partnership");
  });

  it("rejects malformed contact payloads", () => {
    expect(() =>
      parseContactSubmission({
        name: "",
        email: "bad-email",
        subject: "",
        category: "Unknown",
        message: "short",
        company: "",
        startedAt: Date.now() - 2_000,
      }),
    ).toThrowError(InvalidCommunicationRequest);
  });

  it("validates feedback payload with optional email and metadata", () => {
    const submission = parseFeedbackSubmission({
      category: "Suggest Improvement",
      message: "Please make the next-lesson prompt button easier to discover.",
      email: "",
      page: "/courses/thinking-clearly",
      language: "en",
      browser: "Mozilla/5.0",
      viewport: "1280x720",
      company: "",
      startedAt: Date.now() - 2_000,
    });

    expect(submission.category).toBe("Suggest Improvement");
    expect(submission.email).toBe("");
    expect(submission.page).toBe("/courses/thinking-clearly");
  });

  it("blocks spam payloads via url burst", () => {
    expect(() =>
      parseFeedbackSubmission({
        category: "General Feedback",
        message: "https://a.dev https://b.dev https://c.dev",
        email: "",
        page: "/",
        language: "en",
        browser: "Mozilla/5.0",
        viewport: "375x667",
        company: "",
        startedAt: Date.now() - 2_000,
      }),
    ).toThrowError(InvalidCommunicationRequest);

  });
});

describe("communication rate limiter", () => {
  it("limits repeated requests within the configured window", () => {
    const limiter = new CommunicationRateLimiter({
      maxRequests: 2,
      windowMs: 10_000,
    });

    const first = limiter.check("feedback", "127.0.0.1");
    const second = limiter.check("feedback", "127.0.0.1");

    expect(first.remaining).toBe(1);
    expect(second.remaining).toBe(0);

    expect(() => limiter.check("feedback", "127.0.0.1")).toThrowError(
      InvalidCommunicationRequest,
    );
  });
});
