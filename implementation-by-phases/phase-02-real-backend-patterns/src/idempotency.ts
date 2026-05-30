import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

export type IdempotencyStatus = "in_progress" | "completed" | "failed";

export interface IdempotencyRecord<T = unknown> {
  key: string;
  status: IdempotencyStatus;
  expiresAt: number;
  response?: T;
}

export class IdempotencyStore {
  constructor(
    private readonly docClient: DynamoDBDocumentClient,
    private readonly tableName = process.env.IDEMPOTENCY_TABLE ?? "idempotency"
  ) {}

  /**
   * Starts operation only when idempotency key is new.
   *
   * Example: payment webhook processor calls `begin(eventId)` before side effects so replayed provider events do not double-charge users.
   */
  async begin(key: string, ttlSeconds = 86_400): Promise<"started" | "duplicate"> {
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    try {
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: { pk: `IDEMPOTENCY#${key}`, key, status: "in_progress", expiresAt },
          ConditionExpression: "attribute_not_exists(pk)",
        })
      );
      return "started";
    } catch (error) {
      if (error instanceof Error && error.name === "ConditionalCheckFailedException") return "duplicate";
      throw error;
    }
  }

  /**
   * Gets current idempotency record and cached response.
   *
   * Example: duplicate API request returns stored `201` response body instead of executing fulfillment again.
   */
  async get<T>(key: string): Promise<IdempotencyRecord<T> | undefined> {
    const result = await this.docClient.send(new GetCommand({ TableName: this.tableName, Key: { pk: `IDEMPOTENCY#${key}` } }));
    return result.Item as IdempotencyRecord<T> | undefined;
  }

  /**
   * Marks operation completed and stores replayable response.
   *
   * Example: after webhook delivery succeeds, store `{ deliveredAt, statusCode }` so future retries can short-circuit.
   */
  async complete<T>(key: string, response: T): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `IDEMPOTENCY#${key}` },
        UpdateExpression: "SET #status = :status, response = :response",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": "completed", ":response": response },
      })
    );
  }

  /**
   * Marks operation failed while preserving key until TTL expires.
   *
   * Example: compliance-sensitive fulfillment records failed terminal state so operators can audit why processing stopped.
   */
  async fail<T>(key: string, response: T): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: `IDEMPOTENCY#${key}` },
        UpdateExpression: "SET #status = :status, response = :response",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": "failed", ":response": response },
      })
    );
  }
}
