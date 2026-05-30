#!/usr/bin/env tsx
import { pathToFileURL } from "node:url";
import { kmsDisasterRecoveryRunbook, kmsLifecycleEvent } from "../index.js";

/**
 * Real-world DR example: document restore steps for encrypted workloads and emit
 * an event that can notify incident, backup, and compliance systems.
 */
export function buildKmsDisasterRecoveryExample() {
  const aliasName = "alias/prod-customer-pii";
  return {
    runbook: kmsDisasterRecoveryRunbook("us-east-1", "us-west-2", aliasName),
    event: kmsLifecycleEvent({ keyRef: aliasName, eventType: "AliasChanged", actorId: "incident-commander", reason: "regional failover" }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(buildKmsDisasterRecoveryExample(), null, 2));
}
