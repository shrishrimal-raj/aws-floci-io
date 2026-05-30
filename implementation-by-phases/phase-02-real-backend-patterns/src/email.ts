import { SendEmailCommand, type SESClient } from "@aws-sdk/client-ses";
import { SendEmailCommand as SendEmailV2Command, type SESv2Client } from "@aws-sdk/client-sesv2";

export interface TransactionalEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class SesMailer {
  constructor(private readonly ses: SESClient) {}

  /**
   * Sends transactional email through SES v1 API.
   *
   * Example: send delivery-failure alert to tenant admin when webhook endpoint enters DLQ.
   */
  async send(input: TransactionalEmail): Promise<void> {
    await this.ses.send(
      new SendEmailCommand({
        Source: input.from,
        Destination: { ToAddresses: [input.to] },
        Message: {
          Subject: { Data: input.subject },
          Body: { Text: { Data: input.text }, ...(input.html && { Html: { Data: input.html } }) },
        },
      })
    );
  }
}

export class SesV2Mailer {
  constructor(private readonly ses: SESv2Client) {}

  /**
   * Sends transactional email through SES v2 API.
   *
   * Example: modern production services use SES v2 with configuration sets for bounce/complaint observability.
   */
  async send(input: TransactionalEmail): Promise<void> {
    await this.ses.send(
      new SendEmailV2Command({
        FromEmailAddress: input.from,
        Destination: { ToAddresses: [input.to] },
        Content: {
          Simple: {
            Subject: { Data: input.subject },
            Body: { Text: { Data: input.text }, ...(input.html && { Html: { Data: input.html } }) },
          },
        },
      })
    );
  }
}

/**
 * Builds tenant-safe webhook failure email content.
 *
 * Example: notify customer success and tenant admin with endpoint ID, event ID, and remediation hint without leaking secret payloads.
 */
export function webhookFailureEmail(input: {
  from: string;
  to: string;
  tenantId: string;
  endpointId: string;
  eventId: string;
  statusCode?: number;
}): TransactionalEmail {
  const subject = `[TaskFlow] Webhook delivery failed for ${input.endpointId}`;
  const text = `Tenant ${input.tenantId} webhook ${input.endpointId} failed for event ${input.eventId}. Status: ${input.statusCode ?? "network"}. Review endpoint health and replay from DLQ.`;
  return { from: input.from, to: input.to, subject, text, html: `<p>${text}</p>` };
}
