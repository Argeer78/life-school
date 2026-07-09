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

interface MailWebhookBody {
  readonly to: string;
  readonly replyTo: string | null;
  readonly subject: string;
  readonly text: string;
  readonly metadata: Record<string, string>;
}

class WebhookMailTransport implements ContactMailTransport {
  constructor(private readonly webhookUrl: string) {}

  async send(payload: ContactMailPayload): Promise<void> {
    const body: MailWebhookBody = {
      to: payload.to,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      metadata: payload.metadata,
    };
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error("CONTACT_MAIL_DELIVERY_FAILED");
    }
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
  const webhookUrl = environment.CONTACT_MAIL_WEBHOOK_URL?.trim() ?? "";
  if (webhookUrl.length > 0) {
    return new WebhookMailTransport(webhookUrl);
  }
  return new ConsoleMailTransport();
}
