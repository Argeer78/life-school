import nodemailer from "nodemailer";

export const contactInbox = "contact@alphasynthai.com";

export interface ContactMailPayload {
  readonly kind: "contact" | "feedback";
  readonly to: string;
  readonly replyTo: string | null;
  readonly subject: string;
  readonly text: string;
  readonly metadata: Record<string, string>;
}

export interface ContactMailTransport {
  send(payload: ContactMailPayload): Promise<void>;
}

interface SmtpMailConfig {
  readonly from: string;
  readonly defaultTo: string;
}

export class MissingSmtpConfigurationError extends Error {
  readonly code = "SMTP_CONFIGURATION_MISSING";
  readonly missing: ReadonlyArray<string>;

  constructor(missing: ReadonlyArray<string>) {
    super("SMTP_CONFIGURATION_MISSING");
    this.missing = missing;
  }
}

class SmtpMailTransport implements ContactMailTransport {
  constructor(
    private readonly transporter: nodemailer.Transporter,
    private readonly config: SmtpMailConfig,
  ) {}

  async send(payload: ContactMailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: payload.to || this.config.defaultTo,
      replyTo: payload.replyTo ?? undefined,
      subject: payload.subject,
      text: payload.text,
      headers: {
        "X-Lifeschool-Mail-Kind": payload.kind,
      },
    });
  }
}

class ConsoleMailTransport implements ContactMailTransport {
  async send(payload: ContactMailPayload): Promise<void> {
    console.info("[contact:mail:queued]", {
      kind: payload.kind,
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      metadata: payload.metadata,
    });
  }
}

export function createContactMailTransport(
  environment: NodeJS.ProcessEnv,
): ContactMailTransport {
  const mode = environment.NODE_ENV?.trim() || "development";
  const host = environment.SMTP_HOST?.trim() ?? "";
  const port = Number(environment.SMTP_PORT?.trim() ?? "0");
  const secureRaw = (environment.SMTP_SECURE?.trim() ?? "").toLowerCase();
  const user = environment.SMTP_USER?.trim() ?? "";
  const pass = environment.SMTP_PASS?.trim() ?? "";
  const streamTransport =
    (environment.SMTP_STREAM_TRANSPORT?.trim() ?? "").toLowerCase() ===
    "true";
  const from = environment.MAIL_FROM?.trim() || `Lifeschool <${contactInbox}>`;
  const defaultTo = environment.MAIL_TO?.trim() || contactInbox;
  const secure = secureRaw === "true";

  const missing = [
    ["SMTP_HOST", host.length > 0],
    ["SMTP_PORT", Number.isInteger(port) && port > 0],
    ["SMTP_SECURE", secureRaw === "true" || secureRaw === "false"],
    ["SMTP_USER", user.length > 0],
    ["SMTP_PASS", pass.length > 0],
  ] as const;
  const missingFields = missing
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  if (missingFields.length > 0 && !streamTransport) {
    if (mode === "production") {
      throw new MissingSmtpConfigurationError(missingFields);
    }
    console.warn("[contact:mail:fallback]", {
      mode,
      missing: missingFields,
    });
    return new ConsoleMailTransport();
  }

  const transporter = streamTransport
    ? nodemailer.createTransport({
        streamTransport: true,
        newline: "unix",
        buffer: true,
      })
    : nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
  return new SmtpMailTransport(transporter, { from, defaultTo });
}
