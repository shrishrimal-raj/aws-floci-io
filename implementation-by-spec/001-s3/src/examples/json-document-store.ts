#!/usr/bin/env tsx
import { createBucket, deleteBucket, getJsonObject, putJsonObject } from "../use-cases/object-storage.js";

interface UserProfile {
  id: string;
  name: string;
  roles: string[];
}

const bucket = `floci-s3-json-${Date.now()}`;
const key = "users/ada.json";

await createBucket(bucket);
await putJsonObject<UserProfile>({
  bucket,
  key,
  value: { id: "ada", name: "Ada Lovelace", roles: ["admin", "analyst"] },
  metadata: { source: "example" },
});

console.log(await getJsonObject<UserProfile>(bucket, key));

await deleteBucket(bucket);
