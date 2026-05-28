import { KafkaClient } from "@aws-sdk/client-kafka";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new KafkaClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
