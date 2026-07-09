import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("contact and feedback UI", () => {
  it("keeps accessible contact form fields and status messaging", async () => {
    const contact = await readFile(
      new URL("../../src/client/contact.html", import.meta.url),
      "utf8",
    );

    expect(contact).toContain('id="contact-form"');
    expect(contact).toContain('id="contact-name"');
    expect(contact).toContain('id="contact-email"');
    expect(contact).toContain('id="contact-subject"');
    expect(contact).toContain('id="contact-category"');
    expect(contact).toContain('id="contact-message"');
    expect(contact).toContain('id="contact-status" class="contact-status" role="status" aria-live="polite"');
    expect(contact).toContain('mailto:contact@alphasynthai.com');
    expect(contact).toContain('href="/about"');
    expect(contact).toContain('href="/privacy"');
    expect(contact).toContain('href="/terms"');
    expect(contact).toContain('href="/contact"');
  });

  it("keeps feedback modal semantics and mobile-friendly layout rules", async () => {
    const [theme, styles] = await Promise.all([
      readFile(new URL("../../src/client/theme.js", import.meta.url), "utf8"),
      readFile(new URL("../../src/client/styles.css", import.meta.url), "utf8"),
    ]);

    expect(theme).toContain('button.setAttribute("aria-haspopup", "dialog")');
    expect(theme).toContain('dialog.id = "feedback-modal"');
    expect(theme).toContain('role="status" aria-live="polite"');
    expect(theme).toContain('fetch("/api/feedback"');
    expect(styles).toContain(".feedback-modal");
    expect(styles).toContain(".contact-grid");
    expect(styles).toContain("@media (max-width: 840px)");
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain(".contact-grid {");
  });
});
