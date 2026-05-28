import { PricingClient } from "@aws-sdk/client-pricing";
import { awsDefaults } from "@floci-lab/aws-clients";

export const client = new PricingClient(awsDefaults({ endpoint: process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566" }));
