import { CreateLogStreamCommand, PutLogEventsCommand, type CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { GetSecretValueCommand, type SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { GetParameterCommand, type SSMClient } from "@aws-sdk/client-ssm";

export class TaskFlowConfig {
  constructor(private readonly ssm: SSMClient, private readonly env = process.env.NODE_ENV ?? "dev") {}

  async get(name: string): Promise<string> {
    const result = await this.ssm.send(
      new GetParameterCommand({ Name: `/taskflow/${this.env}/${name}`, WithDecryption: true })
    );
    if (!result.Parameter?.Value) throw new Error(`Missing SSM parameter: ${name}`);
    return result.Parameter.Value;
  }
}

export class TaskFlowSecrets {
  constructor(private readonly secrets: SecretsManagerClient) {}

  async json<T>(secretId: string): Promise<T> {
    const result = await this.secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
    const value = result.SecretString ?? Buffer.from(result.SecretBinary ?? new Uint8Array()).toString("utf8");
    return JSON.parse(value) as T;
  }
}

export interface StructuredLogEvent {
  tenantId?: string;
  requestId?: string;
  level: "info" | "warn" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export class CloudWatchJsonLogger {
  constructor(
    private readonly logs: CloudWatchLogsClient,
    private readonly logGroupName = process.env.TASKFLOW_LOG_GROUP ?? "/taskflow/api",
    private readonly logStreamName = process.env.TASKFLOW_LOG_STREAM ?? "local"
  ) {}

  async ensureStream(): Promise<void> {
    try {
      await this.logs.send(new CreateLogStreamCommand({ logGroupName: this.logGroupName, logStreamName: this.logStreamName }));
    } catch (error) {
      if (!(error instanceof Error) || !error.name.includes("ResourceAlreadyExists")) throw error;
    }
  }

  async put(event: StructuredLogEvent): Promise<void> {
    await this.logs.send(
      new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [{ timestamp: Date.now(), message: JSON.stringify(event) }],
      })
    );
  }
}
