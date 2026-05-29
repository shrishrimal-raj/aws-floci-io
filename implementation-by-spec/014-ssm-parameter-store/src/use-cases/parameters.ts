import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  type Parameter,
  type SSMClient,
} from "@aws-sdk/client-ssm";
import { client as defaultClient } from "../client.js";
import { SSMParameterStoreError } from "../errors.js";

export interface AppConfig<TValue> {
  path: string;
  value: TValue;
}

function awsErrorName(error: unknown): string {
  if (error instanceof SSMParameterStoreError && error.cause instanceof Error) return error.cause.name;
  return error instanceof Error ? error.name : "";
}

function wrapError(operation: string, error: unknown): never {
  const code = awsErrorName(error) || "UNKNOWN";
  throw new SSMParameterStoreError(code, `SSM Parameter Store ${operation} failed`, error);
}

/**
 * Put String or SecureString parameter with overwrite enabled.
 *
 * @example
 * await putStringParameter("/app/dev/db/url", "postgres://localhost");
 */
export async function putStringParameter(name: string, value: string, secure = false, ssm: SSMClient = defaultClient): Promise<void> {
  try {
    await ssm.send(new PutParameterCommand({ Name: name, Value: value, Type: secure ? "SecureString" : "String", Overwrite: true }));
  } catch (error) {
    wrapError("putStringParameter", error);
  }
}

/**
 * Get parameter value as string with optional decryption.
 *
 * @example
 * const value = await getStringParameter("/app/dev/db/url");
 */
export async function getStringParameter(name: string, decrypt = true, ssm: SSMClient = defaultClient): Promise<string | undefined> {
  try {
    return (await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: decrypt }))).Parameter?.Value;
  } catch (error) {
    wrapError("getStringParameter", error);
  }
}

/**
 * Put JSON parameter, optionally as SecureString.
 *
 * @example
 * await putJsonParameter("/app/dev/features", { beta: true });
 */
export async function putJsonParameter(name: string, value: unknown, secure = false, ssm: SSMClient = defaultClient): Promise<void> {
  return putStringParameter(name, JSON.stringify(value), secure, ssm);
}

/**
 * Get JSON parameter and parse typed value.
 *
 * @example
 * const cfg = await getJsonParameter<{ beta: boolean }>("/app/dev/features");
 */
export async function getJsonParameter<TValue = unknown>(name: string, ssm: SSMClient = defaultClient): Promise<TValue> {
  const value = await getStringParameter(name, true, ssm);
  if (!value) throw new SSMParameterStoreError("EMPTY_PARAMETER", `${name} empty`);
  return JSON.parse(value) as TValue;
}

/**
 * Get parameters under path, with recursive traversal by default.
 *
 * @example
 * const params = await getParametersByPath("/app/dev");
 */
export async function getParametersByPath(path: string, recursive = true, ssm: SSMClient = defaultClient): Promise<Parameter[]> {
  try {
    return (await ssm.send(new GetParametersByPathCommand({ Path: path, Recursive: recursive, WithDecryption: true }))).Parameters ?? [];
  } catch (error) {
    wrapError("getParametersByPath", error);
  }
}

/**
 * Load path parameters into key/value object using final path segment as key.
 *
 * @example
 * const config = await loadConfigByPath("/app/dev");
 */
export async function loadConfigByPath(path: string, ssm: SSMClient = defaultClient): Promise<Record<string, string>> {
  const params = await getParametersByPath(path, true, ssm);
  return Object.fromEntries(
    params.flatMap((param) => (param.Name && param.Value ? [[param.Name.split("/").at(-1) ?? param.Name, param.Value]] : []))
  );
}

/**
 * Delete one parameter; undefined or missing names are ignored.
 *
 * @example
 * await deleteParameter("/app/dev/db/url");
 */
export async function deleteParameter(name: string | undefined, ssm: SSMClient = defaultClient): Promise<void> {
  if (!name) return;
  try {
    await ssm.send(new DeleteParameterCommand({ Name: name }));
  } catch (error) {
    if (awsErrorName(error) === "ParameterNotFound") return;
    wrapError("deleteParameter", error);
  }
}

/**
 * Build hierarchical app/env/key parameter path.
 *
 * @example
 * const path = parameterPath("app", "dev", "db/url");
 */
export function parameterPath(app: string, env: string, key: string): string {
  return `/${app}/${env}/${key}`;
}

/**
 * Build typed app config holder.
 *
 * @example
 * const cfg = appConfig("/app/dev/features", { beta: true });
 */
export function appConfig<TValue>(path: string, value: TValue): AppConfig<TValue> {
  return { path, value };
}
