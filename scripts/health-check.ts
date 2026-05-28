#!/usr/bin/env tsx
const url = process.env.AWS_ENDPOINT_URL ?? "http://localhost:4566";
try {
  const res = await fetch(`${url}/_floci/health`);
  if (!res.ok) {
    console.error(`Floci unhealthy: ${res.status}`);
    process.exit(1);
  }
  const body = await res.text();
  console.log("Floci is healthy");
  console.log(body);
} catch (err) {
  console.error("Floci unreachable. Run: docker compose up -d");
  console.error(err);
  process.exit(1);
}
