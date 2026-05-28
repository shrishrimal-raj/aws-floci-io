import { describe, expect, it } from "vitest";
import { createEventClients } from "../src/event-clients.js";
import { CommercePipeProvisioner, CommerceScheduler, sqsToStepFunctionsPipePlan } from "../src/scheduler-pipes.js";

class FakeClient {
  commands: unknown[] = [];
  async send(command: unknown) {
    this.commands.push(command);
    return {};
  }
}

describe("Scheduler, Pipes, and clients", () => {
  it("creates Phase 04 AWS clients", () => {
    const clients = createEventClients({ endpoint: "http://localhost:4566" });
    expect(clients.dynamodbStreams.constructor.name).toBe("DynamoDBStreamsClient");
    expect(clients.eventBridge.constructor.name).toBe("EventBridgeClient");
    expect(clients.scheduler.constructor.name).toBe("SchedulerClient");
    expect(clients.pipes.constructor.name).toBe("PipesClient");
    expect(clients.stepFunctions.constructor.name).toBe("SFNClient");
    expect(clients.kinesis.constructor.name).toBe("KinesisClient");
    expect(clients.firehose.constructor.name).toBe("FirehoseClient");
  });

  it("creates daily schedule command", async () => {
    const client = new FakeClient();
    await new CommerceScheduler(client as never).createDaily({ name: "daily", targetArn: "arn:target", roleArn: "arn:role", hourUtc: 3, payload: { report: true } });
    expect(client.commands[0]?.constructor.name).toBe("CreateScheduleCommand");
  });

  it("plans and creates SQS to Step Functions pipe", async () => {
    const plan = sqsToStepFunctionsPipePlan("checkout", "arn:sqs", "arn:sfn", "arn:role");
    expect(plan.filterPattern).toEqual({ body: { eventType: ["CheckoutStarted"] } });
    const client = new FakeClient();
    await new CommercePipeProvisioner(client as never).create(plan);
    expect(client.commands[0]?.constructor.name).toBe("CreatePipeCommand");
  });
});
