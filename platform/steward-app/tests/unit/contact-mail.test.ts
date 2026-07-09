import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn(async () => {});
const createTransport = vi.fn(() => ({ sendMail }));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

describe("contact SMTP adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses Hostinger SMTP transport when env variables are present", async () => {
    const { createContactMailTransport } = await import("../../src/server/contact-mail.js");
    const transport = createContactMailTransport({
      NODE_ENV: "production",
      SMTP_HOST: "smtp.hostinger.com",
      SMTP_PORT: "465",
      SMTP_SECURE: "true",
      SMTP_USER: "contact@alphasynthai.com",
      SMTP_PASS: "secret-password",
      MAIL_FROM: "Lifeschool <contact@alphasynthai.com>",
      MAIL_TO: "contact@alphasynthai.com",
    });

    await transport.send({
      kind: "feedback",
      to: "contact@alphasynthai.com",
      replyTo: "learner@example.com",
      subject: "Feedback",
      text: "Message body",
      metadata: { page: "/contact" },
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: "contact@alphasynthai.com",
        pass: "secret-password",
      },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Lifeschool <contact@alphasynthai.com>",
        to: "contact@alphasynthai.com",
        replyTo: "learner@example.com",
        subject: "Feedback",
        text: "Message body",
      }),
    );
  });

  it("falls back safely when SMTP configuration is missing", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { createContactMailTransport } = await import("../../src/server/contact-mail.js");
      const transport = createContactMailTransport({
        NODE_ENV: "development",
        SMTP_HOST: "",
      });
      await transport.send({
        kind: "contact",
        to: "contact@alphasynthai.com",
        replyTo: null,
        subject: "Subject",
        text: "Body",
        metadata: { category: "General Question" },
      });

      expect(warnSpy).toHaveBeenCalledWith(
        "[contact:mail:fallback]",
        expect.objectContaining({
          mode: "development",
        }),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        "[contact:mail:queued]",
        expect.objectContaining({
          kind: "contact",
          to: "contact@alphasynthai.com",
        }),
      );
    } finally {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it("never exposes SMTP secret config in browser client files", async () => {
    const [theme, contactClient, contactHtml] = await Promise.all([
      readFile(new URL("../../src/client/theme.js", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/contact.js", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/contact.html", import.meta.url), "utf8"),
    ]);

    for (const content of [theme, contactClient, contactHtml]) {
      expect(content).not.toMatch(/SMTP_HOST|SMTP_PORT|SMTP_SECURE|SMTP_USER|SMTP_PASS|MAIL_FROM|MAIL_TO/);
    }
  });
});
