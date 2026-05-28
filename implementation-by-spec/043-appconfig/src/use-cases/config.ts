import {
  AppConfigClient,
  CreateApplicationCommand,
  CreateConfigurationProfileCommand,
  CreateEnvironmentCommand,
  DeleteApplicationCommand,
  StartDeploymentCommand,
} from "@aws-sdk/client-appconfig";
import { client as defaultClient } from "../client.js";
import { AppConfigError } from "../errors.js";

const fail = (op: string, e: unknown): never => {
  throw new AppConfigError(e instanceof Error && e.name ? e.name : "UNKNOWN", `AppConfig ${op} failed`, e);
};

function requireValue(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} missing`);
  return value;
}

export async function createApplication(name: string, appconfig: AppConfigClient = defaultClient): Promise<string> {
  try {
    const result = await appconfig.send(new CreateApplicationCommand({ Name: name }));
    return requireValue(result.Id, "Application Id");
  } catch (e) {
    return fail("createApplication", e);
  }
}

export async function createEnvironment(applicationId: string, name = "dev", appconfig: AppConfigClient = defaultClient): Promise<string> {
  try {
    const result = await appconfig.send(new CreateEnvironmentCommand({ ApplicationId: applicationId, Name: name }));
    return requireValue(result.Id, "Environment Id");
  } catch (e) {
    return fail("createEnvironment", e);
  }
}

export async function createHostedJsonProfile(
  applicationId: string,
  name = "flags",
  appconfig: AppConfigClient = defaultClient
): Promise<string> {
  try {
    const result = await appconfig.send(
      new CreateConfigurationProfileCommand({ ApplicationId: applicationId, Name: name, LocationUri: "hosted", Type: "AWS.Freeform" })
    );
    return requireValue(result.Id, "ConfigurationProfile Id");
  } catch (e) {
    return fail("createHostedJsonProfile", e);
  }
}

export async function startDeployment(
  applicationId: string,
  environmentId: string,
  profileId: string,
  version = "1",
  strategyId = "AppConfig.AllAtOnce",
  appconfig: AppConfigClient = defaultClient
) {
  try {
    return (
      await appconfig.send(
        new StartDeploymentCommand({
          ApplicationId: applicationId,
          EnvironmentId: environmentId,
          ConfigurationProfileId: profileId,
          ConfigurationVersion: version,
          DeploymentStrategyId: strategyId,
        })
      )
    ).DeploymentNumber;
  } catch (e) {
    return fail("startDeployment", e);
  }
}

export async function deleteApplication(applicationId: string | undefined, appconfig: AppConfigClient = defaultClient): Promise<void> {
  if (!applicationId) return;
  try {
    await appconfig.send(new DeleteApplicationCommand({ ApplicationId: applicationId }));
  } catch (e) {
    return fail("deleteApplication", e);
  }
}

export const featureFlags = (flags: Record<string, boolean>) => ({ version: 1, flags });
