#!/usr/bin/env tsx
import {
  createSingleTable,
  deleteTable,
  getJsonEntity,
  putJsonEntity,
} from "../use-cases/table.js";

interface UserProfile extends Record<string, string | number | boolean> {
  name: string;
  email: string;
  active: boolean;
}

const table = `floci-ddb-json-${Date.now()}`;

await createSingleTable(table);
await putJsonEntity<UserProfile>(
  {
    pk: "USER#1",
    sk: "PROFILE",
    entityType: "UserProfile",
    value: { name: "Ada", email: "ada@example.com", active: true },
    gsi1pk: "EMAIL#ada@example.com",
    gsi1sk: "USER#1",
  },
  table,
);

console.log(await getJsonEntity<UserProfile>("USER#1", "PROFILE", table));

await deleteTable(table);
