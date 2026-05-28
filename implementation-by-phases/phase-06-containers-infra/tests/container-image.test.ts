import { describe, expect, it } from "vitest";
import { EcrRepository, dockerBuildPushCommands, imageUri } from "../src/container-image.js";

class FakeClient {
  commands: unknown[] = [];
  constructor(private readonly response: unknown = {}) {}
  async send(command: unknown) { this.commands.push(command); return this.response; }
}

describe("ECR image workflow", () => {
  it("builds canonical ECR image URI and docker commands", () => {
    const ref = { accountId: "123", region: "us-east-1", repository: "auth", tag: "v1" };
    expect(imageUri(ref)).toBe("123.dkr.ecr.us-east-1.amazonaws.com/auth:v1");
    expect(dockerBuildPushCommands(ref)[2]).toBe("docker push 123.dkr.ecr.us-east-1.amazonaws.com/auth:v1");
  });

  it("creates scan-on-push encrypted ECR repository", async () => {
    const client = new FakeClient({ repository: { repositoryUri: "uri" } });
    await expect(new EcrRepository(client as never).ensure("auth")).resolves.toBe("uri");
    expect(client.commands[0]?.constructor.name).toBe("CreateRepositoryCommand");
  });
});
