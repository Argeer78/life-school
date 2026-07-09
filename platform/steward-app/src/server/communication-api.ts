import { contactInbox, type ContactMailPayload, type ContactMailTransport } from "./contact-mail.js";

const maxNameLength = 120;
const maxEmailLength = 320;
const maxSubjectLength = 180;
const maxMessageLength = 5_000;
const maxCategoryLength = 64;
const minimumStartedAgeMs = 1_500;

const contactCategories = new Set([
  "General Question",
  "Bug Report",
  "Partnership",
  "Press",
  "Educational Institution",
]);

const feedbackCategories = new Set([
  "Suggest Improvement",
  "Report Bug",
  "Suggest Lesson",
  "General Feedback",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function ensureLength(value: string, maxLength: number): boolean {
  return value.length > 0 && value.length <= maxLength;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= maxEmailLength;
}

function hasSpamUrlBurst(text: string): boolean {
  const matches = text.match(/https?:\/\//gi);
  return (matches?.length ?? 0) >= 3;
}

function normalizedIp(address: string | undefined): string {
  return address?.trim() || "unknown";
}

function categoryAllowed(category: string, allowed: Set<string>): boolean {
  return category.length <= maxCategoryLength && allowed.has(category);
}

interface AntiSpamMeta {
  readonly honeypot: string;
  readonly startedAt: number;
}

function validateAntiSpam(meta: AntiSpamMeta): void {
  if (meta.honeypot.length > 0) {
    throw new InvalidCommunicationRequest("SPAM_DETECTED");
  }
  if (!Number.isFinite(meta.startedAt)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  const age = Date.now() - meta.startedAt;
  if (age < minimumStartedAgeMs) {
    throw new InvalidCommunicationRequest("SPAM_DETECTED");
  }
}

function readAntiSpam(body: Record<string, unknown>): AntiSpamMeta {
  return {
    honeypot: trimField(body.company),
    startedAt: Number(body.startedAt ?? 0),
  };
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export class InvalidCommunicationRequest extends Error {
  constructor(
    readonly code:
      | "INVALID_COMMUNICATION_REQUEST"
      | "SPAM_DETECTED"
      | "RATE_LIMITED",
  ) {
    super(code);
  }
}

export class CommunicationDeliveryFailed extends Error {
  readonly code = "COMMUNICATION_DELIVERY_FAILED";
}

export interface CommunicationRateLimitOptions {
  readonly maxRequests: number;
  readonly windowMs: number;
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

export class CommunicationRateLimiter {
  private readonly states = new Map<string, RateLimitState>();

  constructor(private readonly options: CommunicationRateLimitOptions) {}

  check(scope: string, ipAddress: string): { remaining: number; resetAt: number } {
    const now = Date.now();
    const key = `${scope}:${normalizedIp(ipAddress)}`;
    const previous = this.states.get(key);
    if (previous === undefined || previous.resetAt <= now) {
      const state: RateLimitState = {
        count: 1,
        resetAt: now + this.options.windowMs,
      };
      this.states.set(key, state);
      return {
        remaining: Math.max(0, this.options.maxRequests - 1),
        resetAt: state.resetAt,
      };
    }

    previous.count += 1;
    if (previous.count > this.options.maxRequests) {
      throw new InvalidCommunicationRequest("RATE_LIMITED");
    }
    return {
      remaining: Math.max(0, this.options.maxRequests - previous.count),
      resetAt: previous.resetAt,
    };
  }
}

export interface ContactSubmission {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly category: string;
  readonly message: string;
  readonly company: string;
  readonly startedAt: number;
}

export interface FeedbackSubmission {
  readonly category: string;
  readonly message: string;
  readonly email: string;
  readonly page: string;
  readonly language: string;
  readonly browser: string;
  readonly viewport: string;
  readonly company: string;
  readonly startedAt: number;
}

export function parseContactSubmission(body: unknown): ContactSubmission {
  if (!isRecord(body)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }

  const name = clean(trimField(body.name));
  const email = clean(trimField(body.email));
  const subject = clean(trimField(body.subject));
  const category = clean(trimField(body.category));
  const message = trimField(body.message);
  const company = trimField(body.company);
  const startedAt = Number(body.startedAt ?? 0);

  if (!ensureLength(name, maxNameLength)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!isEmail(email)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(subject, maxSubjectLength)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!categoryAllowed(category, contactCategories)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(message, maxMessageLength) || hasSpamUrlBurst(message)) {
    throw new InvalidCommunicationRequest("SPAM_DETECTED");
  }

  validateAntiSpam(readAntiSpam({ company, startedAt }));

  return {
    name,
    email,
    subject,
    category,
    message,
    company,
    startedAt,
  };
}

export function parseFeedbackSubmission(body: unknown): FeedbackSubmission {
  if (!isRecord(body)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }

  const category = clean(trimField(body.category));
  const message = trimField(body.message);
  const email = clean(trimField(body.email));
  const page = trimField(body.page);
  const language = clean(trimField(body.language));
  const browser = trimField(body.browser);
  const viewport = trimField(body.viewport);
  const company = trimField(body.company);
  const startedAt = Number(body.startedAt ?? 0);

  if (!categoryAllowed(category, feedbackCategories)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(message, maxMessageLength) || hasSpamUrlBurst(message)) {
    throw new InvalidCommunicationRequest("SPAM_DETECTED");
  }
  if (email.length > 0 && !isEmail(email)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(page, 300)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(language, 16)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(browser, 300)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }
  if (!ensureLength(viewport, 40)) {
    throw new InvalidCommunicationRequest("INVALID_COMMUNICATION_REQUEST");
  }

  validateAntiSpam(readAntiSpam({ company, startedAt }));

  return {
    category,
    message,
    email,
    page,
    language,
    browser,
    viewport,
    company,
    startedAt,
  };
}

function mailText(lines: string[]): string {
  return lines.join("\n");
}

function contactPayload(
  submission: ContactSubmission,
  ipAddress: string,
): ContactMailPayload {
  return {
    kind: "contact",
    to: contactInbox,
    replyTo: submission.email,
    subject: `[Lifeschool Contact] ${submission.category}: ${submission.subject}`,
    text: mailText([
      "New contact form message",
      `Name: ${submission.name}`,
      `Email: ${submission.email}`,
      `Category: ${submission.category}`,
      `Subject: ${submission.subject}`,
      "",
      "Message:",
      submission.message,
      "",
      `IP: ${normalizedIp(ipAddress)}`,
    ]),
    metadata: {
      category: submission.category,
      source: "contact-form",
      ip: normalizedIp(ipAddress),
    },
  };
}

function feedbackPayload(
  submission: FeedbackSubmission,
  ipAddress: string,
): ContactMailPayload {
  return {
    kind: "feedback",
    to: contactInbox,
    replyTo: submission.email.length > 0 ? submission.email : null,
    subject: `[Lifeschool Feedback] ${submission.category}`,
    text: mailText([
      "New feedback submission",
      `Category: ${submission.category}`,
      `Email: ${submission.email || "(not provided)"}`,
      `Page: ${submission.page}`,
      `Language: ${submission.language}`,
      `Browser: ${submission.browser}`,
      `Viewport: ${submission.viewport}`,
      "",
      "Message:",
      submission.message,
      "",
      `IP: ${normalizedIp(ipAddress)}`,
    ]),
    metadata: {
      category: submission.category,
      source: "feedback-modal",
      page: submission.page,
      language: submission.language,
      ip: normalizedIp(ipAddress),
    },
  };
}

export async function processContactSubmission(
  mailer: ContactMailTransport,
  submission: ContactSubmission,
  ipAddress: string,
): Promise<void> {
  try {
    await mailer.send(contactPayload(submission, ipAddress));
  } catch {
    throw new CommunicationDeliveryFailed();
  }
}

export async function processFeedbackSubmission(
  mailer: ContactMailTransport,
  submission: FeedbackSubmission,
  ipAddress: string,
): Promise<void> {
  try {
    await mailer.send(feedbackPayload(submission, ipAddress));
  } catch {
    throw new CommunicationDeliveryFailed();
  }
}
