import { DynamoDBStreamsClient } from "@aws-sdk/client-dynamodb-streams";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { FirehoseClient } from "@aws-sdk/client-firehose";
import { KinesisClient } from "@aws-sdk/client-kinesis";
import { PipesClient } from "@aws-sdk/client-pipes";
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { SFNClient } from "@aws-sdk/client-sfn";
import { awsDefaults, type AwsClientOptions } from "@floci-lab/aws-clients";

export interface EventClients {
  dynamodbStreams: DynamoDBStreamsClient;
  eventBridge: EventBridgeClient;
  scheduler: SchedulerClient;
  pipes: PipesClient;
  stepFunctions: SFNClient;
  kinesis: KinesisClient;
  firehose: FirehoseClient;
}

/**
 * Creates all AWS SDK clients used by Phase 04 advanced event systems.
 * Example: local demos point to LocalStack by default; production passes region/credentials through shared AWS config.
 */
export function createEventClients(options: AwsClientOptions = {}): EventClients {
  const endpoint = options.endpoint ?? process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
  const defaults = awsDefaults({ endpoint, ...options });
  return {
    dynamodbStreams: new DynamoDBStreamsClient(defaults),
    eventBridge: new EventBridgeClient(defaults),
    scheduler: new SchedulerClient(defaults),
    pipes: new PipesClient(defaults),
    stepFunctions: new SFNClient(defaults),
    kinesis: new KinesisClient(defaults),
    firehose: new FirehoseClient(defaults),
  };
}
