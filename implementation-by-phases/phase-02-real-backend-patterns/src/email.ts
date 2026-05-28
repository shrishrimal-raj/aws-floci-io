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
