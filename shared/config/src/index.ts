export interface AppConfig {
  awsEndpoint?: string;
  awsRegion: string;
  logLevel: string;
  nodeEnv: "development" | "test" | "production";
}

export function loadConfig(): AppConfig {
  return {
    awsEndpoint: process.env.AWS_ENDPOINT_URL,
    awsRegion: process.env.AWS_REGION ?? "us-east-1",
    logLevel: process.env.LOG_LEVEL ?? "info",
    nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) ?? "development",
  };
}
