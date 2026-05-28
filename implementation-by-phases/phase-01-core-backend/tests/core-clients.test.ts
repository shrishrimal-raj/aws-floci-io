import { describe, expect, it } from "vitest";
import { createCoreClients } from "../src/core-clients.js";

describe("core backend AWS clients", () => {
  it("creates all Phase 01 service clients", () => {
    const clients = createCoreClients({ endpoint: "http://localhost:4566" });
    expect(clients.s3.constructor.name).toBe("S3Client");
    expect(clients.sqs.constructor.name).toBe("SQSClient");
    expect(clients.sns.constructor.name).toBe("SNSClient");
    expect(clients.dynamodb.constructor.name).toBe("DynamoDBClient");
    expect(clients.lambda.constructor.name).toBe("LambdaClient");
    expect(clients.apiGatewayV1.constructor.name).toBe("APIGatewayClient");
    expect(clients.apiGatewayV2.constructor.name).toBe("ApiGatewayV2Client");
    expect(clients.secretsManager.constructor.name).toBe("SecretsManagerClient");
    expect(clients.ssm.constructor.name).toBe("SSMClient");
    expect(clients.cloudWatchLogs.constructor.name).toBe("CloudWatchLogsClient");
  });
});
