#!/usr/bin/env tsx
import { createInfraClients, dockerBuildPushCommands, imageUri, platformServices, targetGroupName, validateTemplateBasics, vpcTemplate, weightedAliasRecord } from "../../../src/index.js";

const clients = createInfraClients();
console.log("Microservices Platform on ECS demo");
console.log("clients:", Object.fromEntries(Object.entries(clients).map(([name, client]) => [name, client.constructor.name])));
console.log("services:", platformServices.map((service) => `${service.name}:${service.port}`).join(", "));
console.log("sample image:", imageUri({ accountId: "123456789012", region: "us-east-1", repository: "orders", tag: "v1" }));
console.log("docker commands:", dockerBuildPushCommands({ accountId: "123456789012", region: "us-east-1", repository: "orders", tag: "v1" }).length);
console.log("target group:", targetGroupName("orders", "blue"));
console.log("vpc template errors:", validateTemplateBasics(vpcTemplate()));
console.log("blue/green shift:", weightedAliasRecord("api.example.com", "ZROOT", "blue-alb", "ZBLUE", "green-alb", "ZGREEN", 10).ChangeBatch!.Changes!.length, "records");
