import {
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  GetFederationTokenCommand,
  STSClient,
  type Credentials,
} from "@aws-sdk/client-sts";
import { client as defaultClient } from "../client.js";
import { STSError } from "../errors.js";

const err = (op: string, e: unknown): never => {
  throw new STSError(e instanceof Error && e.name ? e.name : "UNKNOWN", `STS ${op} failed`, e);
};

export async function getCallerIdentity(sts: STSClient = defaultClient) {
  try {
    return await sts.send(new GetCallerIdentityCommand({}));
  } catch (e) {
    return err("getCallerIdentity", e);
  }
}

export async function assumeRole(
  roleArn: string,
  sessionName = "floci-session",
  durationSeconds = 900,
  sts: STSClient = defaultClient
): Promise<Credentials> {
  try {
    const r = await sts.send(
      new AssumeRoleCommand({ RoleArn: roleArn, RoleSessionName: sessionName, DurationSeconds: durationSeconds })
    );
    if (!r.Credentials) throw new Error("AssumeRole returned no credentials");
    return r.Credentials;
  } catch (e) {
    return err("assumeRole", e);
  }
}

export async function getFederationToken(
  name = "floci-user",
  durationSeconds = 900,
  sts: STSClient = defaultClient
): Promise<Credentials> {
  try {
    const r = await sts.send(
      new GetFederationTokenCommand({
        Name: name,
        DurationSeconds: durationSeconds,
        Policy: JSON.stringify({ Version: "2012-10-17", Statement: [{ Effect: "Allow", Action: "*", Resource: "*" }] }),
      })
    );
    if (!r.Credentials) throw new Error("GetFederationToken returned no credentials");
    return r.Credentials;
  } catch (e) {
    return err("getFederationToken", e);
  }
}

export function credentialsExpireSoon(creds: Pick<Credentials, "Expiration">, withinMs = 60_000) {
  return !creds.Expiration || creds.Expiration.getTime() - Date.now() < withinMs;
}
