import { describe, expect, it } from "vitest";
import {
  certificateShareText,
  createCertificateId,
  createCertificatePdf,
  formatCompletionDate,
} from "../../src/client/module-certificate.js";

describe("module completion certificate", () => {
  it("creates stable certificate ids for module completion", () => {
    const completedAt = new Date("2026-07-10T12:30:00.000Z");
    const id = createCertificateId("thinking-clearly", completedAt, "Ada Learner");

    expect(id).toMatch(/^LS-THINKING-C-20260710-[A-Z0-9]{8}$/);
    expect(
      createCertificateId("thinking-clearly", completedAt, "Ada Learner"),
    ).toBe(id);
    expect(
      createCertificateId("thinking-clearly", completedAt, ""),
    ).not.toBe(id);
  });

  it("formats completion date as ISO day", () => {
    expect(formatCompletionDate(new Date("2026-07-10T12:30:00.000Z"))).toBe(
      "2026-07-10",
    );
  });

  it("generates a professional pdf payload with required certificate fields", () => {
    const certificate = {
      learnerName: "Ada Learner",
      moduleTitle: "Thinking Clearly",
      moduleSlug: "thinking-clearly",
      completionDate: new Date("2026-07-10T12:30:00.000Z"),
      certificateId: "LS-THINKING-C-20260710-0ABC1234",
    };
    const bytes = createCertificatePdf(certificate);
    const pdf = new TextDecoder().decode(bytes);

    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain("Lifeschool");
    expect(pdf).toContain("Module Completion Certificate");
    expect(pdf).toContain("Ada Learner");
    expect(pdf).toContain("Thinking Clearly");
    expect(pdf).toContain("LS-THINKING-C-20260710-0ABC1234");
    expect(pdf).toContain("AlphaSynth AI");
  });

  it("builds share text without gamification language", () => {
    const certificate = {
      learnerName: "",
      moduleTitle: "Making Decisions",
      moduleSlug: "making-decisions",
      completionDate: new Date("2026-07-10T12:30:00.000Z"),
      certificateId: "LS-MAKING-DEC-20260710-0ABC1234",
    };
    const text = certificateShareText(certificate);

    expect(text).toContain("Module: Making Decisions");
    expect(text).toContain("Completion Date: 2026-07-10");
    expect(text).toContain("Certificate ID: LS-MAKING-DEC-20260710-0ABC1234");
    expect(text).not.toMatch(/badge|points|leaderboard|streak|gamification/i);
  });
});
